from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
import uuid
import os
import re
import time
import base64
import httpx
from datetime import datetime as dt
from typing import Optional

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

# Option B — unofficial endpoints (no CAPTCHA)
_OPTION_B_URLS = [
    "https://api.gst.gov.in/commonsvcs/gstsearchdata/searchByGstin?gstin={gstin}",
    "https://services.gst.gov.in/services/api/public/commonapi/searchbygstin?gstin={gstin}",
]

# Option C — official GST portal CAPTCHA-based search
_CAPTCHA_IMG_URL   = "https://services.gst.gov.in/services/captcha"
_CAPTCHA_SEARCH_URL = "https://services.gst.gov.in/services/api/public/commonapi/searchbygstin"

# In-memory captcha session store  {session_id: {cookies, expires_at}}
# Entries are short-lived (5 min) and pruned on each captcha request
_captcha_sessions: dict = {}
_SESSION_TTL = 300  # seconds


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
    # Prune expired sessions
    expired = [k for k, v in _captcha_sessions.items() if v["expires_at"] < now]
    for k in expired:
        del _captcha_sessions[k]

    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        try:
            resp = await client.get(
                _CAPTCHA_IMG_URL,
                headers={
                    "User-Agent": _GST_UA,
                    "Referer": "https://services.gst.gov.in/services/searchtp",
                    "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
                },
            )
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail=f"Could not reach GST portal: {exc}")

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="GST portal returned an error while fetching CAPTCHA.")

    session_id = str(uuid.uuid4())
    _captcha_sessions[session_id] = {
        "cookies": dict(resp.cookies),
        "expires_at": now + _SESSION_TTL,
    }

    content_type = resp.headers.get("content-type", "image/png").split(";")[0]
    image_b64 = base64.b64encode(resp.content).decode()
    return {
        "session_id": session_id,
        "image": f"data:{content_type};base64,{image_b64}",
    }


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

    async with httpx.AsyncClient(timeout=12, follow_redirects=True) as client:

        # ── Option C: CAPTCHA-authenticated search ──────────────────────────
        if session_id and captcha:
            session = _captcha_sessions.get(session_id)
            if not session:
                raise HTTPException(status_code=400, detail="CAPTCHA session expired or invalid. Please refresh the CAPTCHA and try again.")
            if session["expires_at"] < time.time():
                del _captcha_sessions[session_id]
                raise HTTPException(status_code=400, detail="CAPTCHA session expired. Please refresh the CAPTCHA and try again.")

            cookies = session["cookies"]
            headers = {**_GST_HEADERS, "Content-Type": "application/json"}

            # Try POST with JSON body (most common GST portal pattern)
            try:
                resp = await client.post(
                    _CAPTCHA_SEARCH_URL,
                    json={"gstin": gstin, "captcha": captcha.strip()},
                    headers=headers,
                    cookies=cookies,
                )
                if resp.status_code == 200:
                    raw = resp.json()
                    if _has_taxpayer_data(raw):
                        del _captcha_sessions[session_id]  # consume session
                        return _parse_gst_response(raw)
            except Exception:
                pass

            # Fallback: GET with query params + captcha
            try:
                resp = await client.get(
                    _CAPTCHA_SEARCH_URL,
                    params={"gstin": gstin, "captcha": captcha.strip()},
                    headers=_GST_HEADERS,
                    cookies=cookies,
                )
                if resp.status_code == 200:
                    raw = resp.json()
                    if _has_taxpayer_data(raw):
                        del _captcha_sessions[session_id]
                        return _parse_gst_response(raw)
            except Exception:
                pass

            raise HTTPException(
                status_code=422,
                detail="CAPTCHA answer was incorrect or the GST portal rejected the request. Please try again with a fresh CAPTCHA.",
            )

        # ── Option B: unofficial endpoints (no CAPTCHA) ─────────────────────
        for url_tpl in _OPTION_B_URLS:
            try:
                resp = await client.get(url_tpl.format(gstin=gstin), headers=_GST_HEADERS)
                if resp.status_code == 200:
                    raw = resp.json()
                    if _has_taxpayer_data(raw):
                        return _parse_gst_response(raw)
            except Exception:
                continue

        # ── Option A: third-party API (env-var configured) ──────────────────
        api_key = os.getenv("GSTIN_API_KEY", "")
        api_url  = os.getenv("GSTIN_API_URL", "")
        if api_key and api_url:
            try:
                resp = await client.get(
                    f"{api_url.rstrip('/')}/{gstin}",
                    headers={"Authorization": f"Bearer {api_key}", "Accept": "application/json"},
                )
                if resp.status_code == 200:
                    return _parse_gst_response(resp.json())
            except Exception:
                pass

    # All automatic methods failed — signal the frontend to offer CAPTCHA
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
