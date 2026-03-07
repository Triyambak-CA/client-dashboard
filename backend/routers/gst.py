from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
import uuid
import os
import re
import logging
import json as _json
import httpx
from datetime import datetime as dt

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

# Option A — Cashfree VRS API (reliable; set CASHFREE_CLIENT_ID + CASHFREE_CLIENT_SECRET env vars)
_CASHFREE_CLIENT_ID     = os.environ.get("CASHFREE_CLIENT_ID", "")
_CASHFREE_CLIENT_SECRET = os.environ.get("CASHFREE_CLIENT_SECRET", "")
_CASHFREE_URL           = "https://api.cashfree.com/verification/gstin"

# Option B — unofficial/public endpoints (no CAPTCHA, no auth; fast-fail fallback)
_OPTION_B_URLS = [
    "https://api.gst.gov.in/commonsvcs/gstsearchdata/searchByGstin?gstin={gstin}",
]


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


def _parse_cashfree_response(raw: dict, gstin: str) -> dict:
    """Parse Cashfree VRS GSTIN verify response into our standard format."""
    def _parse_date(s: str | None) -> str | None:
        if not s or str(s).strip() in ("NA", "null", "None", "N/A", "-", ""):
            return None
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
            try:
                return dt.strptime(str(s).strip(), fmt).strftime("%Y-%m-%d")
            except (ValueError, TypeError):
                pass
        return str(s)

    # Cashfree uses slightly different field names across API versions — handle both
    legal_name = raw.get("legal_name") or raw.get("legal_name_of_business")
    trade_name = raw.get("trade_name") or raw.get("trade_name_of_business")
    status     = raw.get("gstin_status") or raw.get("gst_in_status")
    reg_date   = _parse_date(raw.get("registration_date") or raw.get("date_of_registration"))
    reg_type   = raw.get("taxpayer_type") or raw.get("constitution_type") or raw.get("constitution_of_business")
    state_jur  = raw.get("state_jurisdiction") or ""

    nob = raw.get("nature_of_business_activities") or raw.get("nature_of_business")
    if isinstance(nob, list):
        nob = ", ".join(str(n) for n in nob if n)
    elif nob:
        nob = str(nob)
    else:
        nob = None

    addr = raw.get("principal_place_address") or raw.get("principal_address")
    principal_address = None
    if isinstance(addr, dict):
        parts = [
            addr.get("building_name"), addr.get("building_number"),
            addr.get("floor_number"), addr.get("street"),
            addr.get("location"), addr.get("district_name"), addr.get("state_name"),
        ]
        pin = addr.get("pincode", "")
        joined = ", ".join(p for p in parts if p)
        principal_address = f"{joined} - {pin}" if pin else (joined or None)
    elif isinstance(addr, str) and addr.strip():
        principal_address = addr.strip()

    return {
        "legal_name":           legal_name,
        "trade_name":           trade_name,
        "gstin_status":         status,
        "state":                state_jur,
        "state_code":           gstin[:2] if gstin else None,
        "registration_type":    reg_type,
        "registration_date":    reg_date,
        "cancellation_date":    None,   # not provided by Cashfree
        "principal_address":    principal_address,
        "nature_of_business":   nob,
        "einvoice_applicable":  None,   # not provided by Cashfree
        "last_fetched_at":      dt.utcnow().isoformat(),
    }


@router.get("/lookup/{gstin}")
async def lookup_gstin(
    gstin: str,
    _:     User = Depends(get_current_user),
):
    """
    Fetch taxpayer data by GSTIN.
    Tries Option A (Cashfree VRS, if credentials configured) then Option B (unofficial endpoints).
    """
    gstin = gstin.upper().strip()
    if not _GSTIN_RE.match(gstin):
        raise HTTPException(status_code=400, detail="Invalid GSTIN format")

    # ── Option A: Cashfree VRS API ────────────────────────────────────────────
    if _CASHFREE_CLIENT_ID and _CASHFREE_CLIENT_SECRET:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    _CASHFREE_URL,
                    headers={
                        "x-client-id":     _CASHFREE_CLIENT_ID,
                        "x-client-secret": _CASHFREE_CLIENT_SECRET,
                        "x-api-version":   "2023-08-01",
                        "Content-Type":    "application/json",
                    },
                    json={"gstin": gstin},
                )
            if resp.status_code == 200:
                raw = resp.json()
                if raw.get("is_valid") and (raw.get("legal_name") or raw.get("legal_name_of_business") or raw.get("trade_name")):
                    return _parse_cashfree_response(raw, gstin)
            else:
                _log.warning("Cashfree GST lookup returned %s for %s: %s", resp.status_code, gstin, resp.text[:300])
        except Exception as exc:
            _log.warning("Cashfree GST lookup failed for %s: %s", gstin, exc)

    # ── Option B: unofficial/public endpoints (no CAPTCHA) — fast-fail ───────
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

    raise HTTPException(
        status_code=503,
        detail="Could not fetch GST data automatically. Please fill in the details manually.",
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
