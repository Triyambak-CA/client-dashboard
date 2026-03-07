from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
import uuid
import os
import re
import httpx
from datetime import datetime as dt

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

_GST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://services.gst.gov.in/services/searchtp",
    "Origin": "https://services.gst.gov.in",
}

# Candidate URLs for Option B (unofficial, no CAPTCHA)
_OPTION_B_URLS = [
    "https://api.gst.gov.in/commonsvcs/gstsearchdata/searchByGstin?gstin={gstin}",
    "https://services.gst.gov.in/services/api/public/commonapi/searchbygstin?gstin={gstin}",
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
    # Some APIs nest under taxpayerInfo or similar
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


@router.get("/lookup/{gstin}")
async def lookup_gstin(
    gstin: str,
    _:     User    = Depends(get_current_user),
):
    """Fetch taxpayer data from the GST portal by GSTIN (no CAPTCHA for basic lookup)."""
    gstin = gstin.upper().strip()
    if not _GSTIN_RE.match(gstin):
        raise HTTPException(status_code=400, detail="Invalid GSTIN format")

    # Option B — try unofficial GST portal endpoints
    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        for url_tpl in _OPTION_B_URLS:
            try:
                resp = await client.get(url_tpl.format(gstin=gstin), headers=_GST_HEADERS)
                if resp.status_code == 200:
                    raw = resp.json()
                    # Verify the response actually has taxpayer data
                    data = raw.get("data", raw)
                    if data.get("lgnm") or data.get("legal_name") or data.get("tradeNam"):
                        return _parse_gst_response(raw)
            except Exception:
                continue

        # Option A — third-party API fallback (configure via env vars)
        api_key = os.getenv("GSTIN_API_KEY", "")
        api_url = os.getenv("GSTIN_API_URL", "")
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

    raise HTTPException(
        status_code=503,
        detail="Could not fetch from GST portal. The portal may require CAPTCHA or is unavailable. Please fill in manually, or configure GSTIN_API_KEY + GSTIN_API_URL env vars for a third-party fallback.",
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
