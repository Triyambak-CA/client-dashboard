from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
import uuid

from database import get_db
from models import GSTRegistration, GSTSignatory, Client
from schemas import GSTCreate, GSTUpdate, GSTResponse, GSTListItem, GSTSignatoryCreate, GSTSignatoryInfo
from auth import get_current_user
from models import User
import crypto

router = APIRouter(prefix="/gst", tags=["GST Registrations"])

ENCRYPTED_FIELDS = ["gst_password", "ewb_password", "ewb_api_password"]


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
