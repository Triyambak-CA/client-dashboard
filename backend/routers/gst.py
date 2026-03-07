from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
import uuid
import re
import time
import base64
import logging
import json as _json
import httpx
from playwright.async_api import async_playwright
from datetime import datetime as dt
from typing import Optional

_log = logging.getLogger(__name__)

from database import get_db
from models import GSTRegistration, GSTSignatory, Client
from schemas import GSTCreate, GSTUpdate, GSTResponse, GSTListItem, GSTSignatoryCreate, GSTSignatoryInfo
from auth import get_current_user
from models import User
import crypto

router = APIRouter(prefix="/gst", tags=["GST Registrations"])

ENCRYPTED_FIELDS = ["gst_password", "ewb_password", "ewb_api_password"]

# ── GSTIN Lookup ──────────────────────────────────────────────────────────────

_GSTIN_RE = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$")

_GST_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

_GST_HEADERS = {
    "User-Agent": _GST_UA,
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://services.gst.gov.in/services/searchtp",
    "Origin": "https://services.gst.gov.in",
}

# Option B — unofficial endpoints (no CAPTCHA); these are often blocked, kept as fast-fail
_OPTION_B_URLS = [
    "https://api.gst.gov.in/commonsvcs/gstsearchdata/searchByGstin?gstin={gstin}",
]

# Option C — official GST portal CAPTCHA-based search via Playwright headless Chrome.
# The GST portal's search endpoint is protected by Akamai Bot Manager which uses JavaScript-based
# fingerprinting (_abck cookie from sensor.js). curl_cffi TLS impersonation alone is not enough.
# Playwright runs a real Chromium browser — Akamai's JS executes normally, the fetch() call for
# the GSTIN search happens from inside the browser context where all Akamai cookies are present.
_CAPTCHA_SEARCH_PATH = "/services/api/public/commonapi/searchbygstin"

# In-memory captcha session store  {session_id: {pw, browser, page, expires_at}}
# Each session holds a live Playwright browser; cleaned up after use or on expiry.
_captcha_sessions: dict = {}
_SESSION_TTL = 300  # seconds


async def _close_browser_session(entry: dict) -> None:
    """Best-effort close of a Playwright browser session."""
    try:
        if entry.get("browser"):
            await entry["browser"].close()
    except Exception:
        pass
    try:
        if entry.get("pw"):
            await entry["pw"].stop()
    except Exception:
        pass


def _addr_str(a: dict) -> str:
    parts = [a.get("bnm"), a.get("bno"), a.get("flno"), a.get("st"),
             a.get("loc"), a.get("dst"), a.get("stcd")]
    pin = a.get("pncd", "")
    joined = ", ".join(p for p in parts if p)
    return f"{joined} - {pin}" if pin else joined


def _parse_gst_response(raw: dict) -> dict:
    """Normalise GST portal / third-party API response into a flat dict."""
    data = raw.get("data", raw)
    if not data.get("lgnm") and not data.get("legal_name"):
        data = raw.get("taxpayerInfo", raw)

    pradr = data.get("pradr", {})
    addr_parts = pradr.get("addr", {}) if isinstance(pradr, dict) else {}
    principal_address = _addr_str(addr_parts) if addr_parts else (pradr.get("adr") if isinstance(pradr, dict) else None)

    nob = data.get("nob", [])
    if isinstance(nob, list):
        nob = ", ".join(n for n in nob if n)

    reg_date = data.get("rgdt") or data.get("registration_date")
    can_date = data.get("cxdt") or data.get("cancellation_date")
    if can_date in (None, "NA", "", "null"):
        can_date = None

    einv = data.get("einvoiceStatus")
    if einv is not None:
        einv = str(einv).strip().lower() in ("yes", "true", "1", "applicable")
    else:
        einv = None

    return {
        "legal_name":           data.get("lgnm") or data.get("legal_name"),
        "trade_name":           data.get("tradeNam") or data.get("tradeName") or data.get("trade_name"),
        "gstin_status":         data.get("sts") or data.get("status"),
        "state":                data.get("stj") or addr_parts.get("stcd"),
        "state_code":           (data.get("gstin", "") or "")[:2] or None,
        "registration_type":    data.get("dty") or data.get("registration_type"),
        "registration_date":    reg_date,
        "cancellation_date":    can_date,
        "principal_address":    principal_address,
        "nature_of_business":   nob or None,
        "einvoice_applicable":  einv,
        "last_fetched_at":      dt.utcnow().isoformat(),
    }


def _has_taxpayer_data(raw: dict) -> bool:
    data = raw.get("data", raw)
    return bool(data.get("lgnm") or data.get("legal_name") or data.get("tradeNam"))


@router.get("/captcha")
async def get_gst_captcha(_: User = Depends(get_current_user)):
    """
    Fetch a CAPTCHA image from the GST portal.
    Returns {session_id, image} where image is a data-URI (base64).
    Pass session_id + solved captcha text to /gst/lookup/{gstin} to search.
    """
    now = time.time()
    # Prune expired sessions and close their browsers
    expired = [k for k, v in _captcha_sessions.items() if v["expires_at"] < now]
    for k in expired:
        await _close_browser_session(_captcha_sessions[k])
        del _captcha_sessions[k]

    # Launch a real headless Chrome browser via Playwright.
    # This is required because the GST portal's search API is protected by Akamai Bot Manager,
    # which uses JavaScript-based fingerprinting (_abck / bm_sz cookies set by sensor.js).
    # A real browser executes that JS automatically; all Akamai session cookies are set before
    # we fetch the CAPTCHA or call the search API.
    pw = await async_playwright().start()
    browser = None
    try:
        browser = await pw.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        page = await browser.new_page()

        # Navigate to the search page — Akamai's sensor.js runs here and sets its cookies
        await page.goto(
            "https://services.gst.gov.in/services/searchtp",
            timeout=30000,
            wait_until="domcontentloaded",
        )
        # Allow ~2 s for Akamai JS to finish setting its session cookies
        await page.wait_for_timeout(2000)

        # Fetch the CAPTCHA image from *inside* the browser context (same-origin XHR).
        # All Akamai cookies are automatically included — no manual cookie management needed.
        result = await page.evaluate("""
            async () => {
                try {
                    const resp = await fetch('/services/captcha', {
                        headers: {
                            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                            'Referer': location.href,
                        }
                    });
                    if (!resp.ok) return {ok: false, status: resp.status};
                    const buf  = await resp.arrayBuffer();
                    const bytes = new Uint8Array(buf);
                    let bin = '';
                    for (let b of bytes) bin += String.fromCharCode(b);
                    const b64 = btoa(bin);
                    const ct  = (resp.headers.get('content-type') || 'image/png').split(';')[0];
                    return {ok: true, image: `data:${ct};base64,${b64}`};
                } catch (e) {
                    return {ok: false, error: String(e)};
                }
            }
        """)

        if not result or not result.get("ok"):
            err = (result or {}).get("error") or (result or {}).get("status") or "no response"
            raise HTTPException(status_code=502, detail=f"Could not fetch CAPTCHA from GST portal: {err}")

        session_id = str(uuid.uuid4())
        _captcha_sessions[session_id] = {
            "pw": pw, "browser": browser, "page": page,
            "expires_at": now + _SESSION_TTL,
        }
        return {"session_id": session_id, "image": result["image"]}

    except HTTPException:
        await _close_browser_session({"pw": pw, "browser": browser})
        raise
    except Exception as exc:
        await _close_browser_session({"pw": pw, "browser": browser})
        raise HTTPException(status_code=502, detail=f"Browser error while fetching CAPTCHA: {exc}")


@router.get("/lookup/{gstin}")
async def lookup_gstin(
    gstin:      str,
    session_id: Optional[str] = Query(None, description="Session ID from /gst/captcha"),
    captcha:    Optional[str] = Query(None, description="User-solved CAPTCHA text"),
    _:          User = Depends(get_current_user),
):
    """
    Fetch taxpayer data by GSTIN.
    - Without session_id/captcha: tries unofficial endpoints (no CAPTCHA) then third-party API.
    - With session_id + captcha: uses the user-solved CAPTCHA to query the official GST portal.
    """
    gstin = gstin.upper().strip()
    if not _GSTIN_RE.match(gstin):
        raise HTTPException(status_code=400, detail="Invalid GSTIN format")

    # ── Option C: CAPTCHA-authenticated search ───────────────────────────────
    if session_id and captcha:
        session = _captcha_sessions.get(session_id)
        if not session:
            raise HTTPException(status_code=400, detail="CAPTCHA session expired or invalid. Please refresh the CAPTCHA and try again.")
        if session["expires_at"] < time.time():
            del _captcha_sessions[session_id]
            raise HTTPException(status_code=400, detail="CAPTCHA session expired. Please refresh the CAPTCHA and try again.")

        page = session["page"]   # reuse the live Playwright page (Akamai cookies already set)
        portal_err = "no response"

        try:
            # Execute the search fetch from inside the browser — Akamai sees a legitimate
            # same-origin XHR from the same browser session that loaded the search page.
            data = await page.evaluate("""
                async ([gstin, captcha, searchPath]) => {
                    try {
                        const params = new URLSearchParams({gstin, captcha});
                        const resp = await fetch(searchPath + '?' + params.toString(), {
                            headers: {
                                'Accept': 'application/json, text/plain, */*',
                                'Referer': location.href,
                            }
                        });
                        const text = await resp.text();
                        return {status: resp.status, body: text};
                    } catch (e) {
                        return {status: 0, body: String(e)};
                    }
                }
            """, [gstin, captcha.strip(), _CAPTCHA_SEARCH_PATH])

            status = data["status"]
            body   = data["body"] or ""
            portal_err = f"GET {status}: {body[:600]}"

            if status == 200 and body.strip():
                try:
                    raw = _json.loads(body)
                except Exception:
                    pass  # non-JSON body; portal_err already holds the raw text
                else:
                    if _has_taxpayer_data(raw):
                        await _close_browser_session(session)
                        del _captcha_sessions[session_id]
                        return _parse_gst_response(raw)
                    else:
                        portal_err = f"GET 200 no-data: {body[:600]}"
        except Exception as e:
            portal_err = f"evaluate error: {e}"

        _log.warning("GST CAPTCHA lookup failed for %s: %s", gstin, portal_err)
        raise HTTPException(
            status_code=422,
            detail=f"CAPTCHA answer was incorrect or the GST portal rejected the request. Please try again with a fresh CAPTCHA. (debug: {portal_err})",
        )

    # ── Option B: unofficial endpoints (no CAPTCHA) — fast-fail ─────────────
    async with httpx.AsyncClient(timeout=5, follow_redirects=True) as client:
        for url_tpl in _OPTION_B_URLS:
            try:
                resp = await client.get(url_tpl.format(gstin=gstin), headers=_GST_HEADERS)
                if resp.status_code == 200:
                    raw = resp.json()
                    if _has_taxpayer_data(raw):
                        return _parse_gst_response(raw)
            except Exception:
                continue

    # Option B failed — signal the frontend to offer CAPTCHA
    raise HTTPException(
        status_code=503,
        detail="CAPTCHA_REQUIRED",
    )


def _encrypt(data: dict) -> dict:
    for f in ENCRYPTED_FIELDS:
        if data.get(f):
            data[f] = crypto.encrypt(data[f])
    return data


def _decrypt(reg: GSTRegistration) -> GSTRegistration:
    for f in ENCRYPTED_FIELDS:
        val = getattr(reg, f, None)
        if val:
            setattr(reg, f, crypto.decrypt(val))
    return reg


def _build_response(reg: GSTRegistration) -> dict:
    _decrypt(reg)
    data = {c.name: getattr(reg, c.name) for c in reg.__table__.columns}
    data["signatories"] = []
    for sig in reg.signatories:
        c = sig.signatory_client
        data["signatories"].append({
            "id": sig.id,
            "signatory_client_id": sig.signatory_client_id,
            "signatory_name": c.legal_name if c else None,
            "signatory_pan":  c.pan if c else None,
            "is_active": sig.is_active,
        })
    return data


@router.get("", response_model=list[GSTListItem])
def list_gst(
    client_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    _:  User    = Depends(get_current_user),
):
    q = db.query(GSTRegistration)
    if client_id:
        q = q.filter(GSTRegistration.client_id == client_id)
    return q.order_by(GSTRegistration.gstin).all()


@router.post("", response_model=GSTResponse, status_code=201)
def create_gst(
    body: GSTCreate,
    db:   Session = Depends(get_db),
    _:    User    = Depends(get_current_user),
):
    if db.query(GSTRegistration).filter(GSTRegistration.gstin == body.gstin).first():
        raise HTTPException(status_code=400, detail="GSTIN already exists")
    data = _encrypt(body.model_dump())
    reg = GSTRegistration(**data)
    db.add(reg)
    db.commit()
    db.refresh(reg)
    db.refresh(reg, ["signatories"])
    return _build_response(reg)


@router.get("/{gst_id}", response_model=GSTResponse)
def get_gst(
    gst_id: uuid.UUID,
    db:     Session = Depends(get_db),
    _:      User    = Depends(get_current_user),
):
    reg = db.query(GSTRegistration).options(
        joinedload(GSTRegistration.signatories).joinedload(GSTSignatory.signatory_client)
    ).filter(GSTRegistration.id == gst_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="GST registration not found")
    return _build_response(reg)


@router.put("/{gst_id}", response_model=GSTResponse)
def update_gst(
    gst_id: uuid.UUID,
    body:   GSTUpdate,
    db:     Session = Depends(get_db),
    _:      User    = Depends(get_current_user),
):
    reg = db.query(GSTRegistration).filter(GSTRegistration.id == gst_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="GST registration not found")
    data = _encrypt(body.model_dump(exclude_none=True))
    for field, value in data.items():
        setattr(reg, field, value)
    db.commit()
    db.refresh(reg)
    return _build_response(reg)


@router.delete("/{gst_id}", status_code=204)
def delete_gst(
    gst_id: uuid.UUID,
    db:     Session = Depends(get_db),
    _:      User    = Depends(get_current_user),
):
    reg = db.query(GSTRegistration).filter(GSTRegistration.id == gst_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="GST registration not found")
    db.delete(reg)
    db.commit()


# ── Signatories ──

@router.post("/{gst_id}/signatories", response_model=GSTSignatoryInfo, status_code=201)
def add_signatory(
    gst_id: uuid.UUID,
    body:   GSTSignatoryCreate,
    db:     Session = Depends(get_db),
    _:      User    = Depends(get_current_user),
):
    reg = db.query(GSTRegistration).filter(GSTRegistration.id == gst_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="GST registration not found")
    client = db.query(Client).filter(Client.id == body.signatory_client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Signatory client not found")
    existing = db.query(GSTSignatory).filter(
        GSTSignatory.gst_registration_id == gst_id,
        GSTSignatory.signatory_client_id == body.signatory_client_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Signatory already added to this GSTIN")
    sig = GSTSignatory(gst_registration_id=gst_id, signatory_client_id=body.signatory_client_id)
    db.add(sig)
    db.commit()
    db.refresh(sig)
    return {
        "id": sig.id,
        "signatory_client_id": sig.signatory_client_id,
        "signatory_name": client.legal_name,
        "signatory_pan":  client.pan,
        "is_active": sig.is_active,
    }


@router.delete("/{gst_id}/signatories/{signatory_id}", status_code=204)
def remove_signatory(
    gst_id:       uuid.UUID,
    signatory_id: uuid.UUID,
    db:           Session = Depends(get_db),
    _:            User    = Depends(get_current_user),
):
    sig = db.query(GSTSignatory).filter(
        GSTSignatory.id == signatory_id,
        GSTSignatory.gst_registration_id == gst_id
    ).first()
    if not sig:
        raise HTTPException(status_code=404, detail="Signatory not found")
    db.delete(sig)
    db.commit()
