from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from database import get_db
from models import Partner
from schemas import PartnerCreate, PartnerUpdate, PartnerResponse
from auth import get_current_user
from models import User

router = APIRouter(prefix="/partners", tags=["Partners"])


def _build_response(p: Partner) -> dict:
    data = {c.name: getattr(p, c.name) for c in p.__table__.columns}
    data["individual_name"] = p.individual.legal_name if p.individual else None
    data["firm_name"]       = p.firm_llp.legal_name if p.firm_llp else None
    return data


@router.get("", response_model=list[PartnerResponse])
def list_partners(
    firm_llp_client_id:   uuid.UUID | None = None,
    individual_client_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    _:  User    = Depends(get_current_user),
):
    q = db.query(Partner)
    if firm_llp_client_id:
        q = q.filter(Partner.firm_llp_client_id == firm_llp_client_id)
    if individual_client_id:
        q = q.filter(Partner.individual_client_id == individual_client_id)
    return [_build_response(p) for p in q.all()]


@router.post("", response_model=PartnerResponse, status_code=201)
def create_partner(
    body: PartnerCreate,
    db:   Session = Depends(get_db),
    _:    User    = Depends(get_current_user),
):
    p = Partner(**body.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return _build_response(p)


@router.get("/{partner_id}", response_model=PartnerResponse)
def get_partner(
    partner_id: uuid.UUID,
    db:         Session = Depends(get_db),
    _:          User    = Depends(get_current_user),
):
    p = db.query(Partner).filter(Partner.id == partner_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Partner record not found")
    return _build_response(p)


@router.put("/{partner_id}", response_model=PartnerResponse)
def update_partner(
    partner_id: uuid.UUID,
    body:       PartnerUpdate,
    db:         Session = Depends(get_db),
    _:          User    = Depends(get_current_user),
):
    p = db.query(Partner).filter(Partner.id == partner_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Partner record not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(p, field, value)
    db.commit()
    db.refresh(p)
    return _build_response(p)


@router.delete("/{partner_id}", status_code=204)
def delete_partner(
    partner_id: uuid.UUID,
    db:         Session = Depends(get_db),
    _:          User    = Depends(get_current_user),
):
    p = db.query(Partner).filter(Partner.id == partner_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Partner record not found")
    db.delete(p)
    db.commit()
