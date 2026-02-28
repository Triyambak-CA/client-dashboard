from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from database import get_db
from models import OtherRegistration
from schemas import OtherRegCreate, OtherRegUpdate, OtherRegResponse
from auth import get_current_user
from models import User
import crypto

router = APIRouter(prefix="/other-registrations", tags=["Other Registrations"])


def _encrypt(data: dict) -> dict:
    if data.get("portal_password"):
        data["portal_password"] = crypto.encrypt(data["portal_password"])
    return data


def _decrypt(r: OtherRegistration) -> OtherRegistration:
    if r.portal_password:
        r.portal_password = crypto.decrypt(r.portal_password)
    return r


@router.get("", response_model=list[OtherRegResponse])
def list_other_regs(
    client_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    _:  User    = Depends(get_current_user),
):
    q = db.query(OtherRegistration)
    if client_id:
        q = q.filter(OtherRegistration.client_id == client_id)
    return [_decrypt(r) for r in q.all()]


@router.post("", response_model=OtherRegResponse, status_code=201)
def create_other_reg(
    body: OtherRegCreate,
    db:   Session = Depends(get_db),
    _:    User    = Depends(get_current_user),
):
    data = _encrypt(body.model_dump())
    r = OtherRegistration(**data)
    db.add(r)
    db.commit()
    db.refresh(r)
    return _decrypt(r)


@router.get("/{reg_id}", response_model=OtherRegResponse)
def get_other_reg(
    reg_id: uuid.UUID,
    db:     Session = Depends(get_db),
    _:      User    = Depends(get_current_user),
):
    r = db.query(OtherRegistration).filter(OtherRegistration.id == reg_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Registration not found")
    return _decrypt(r)


@router.put("/{reg_id}", response_model=OtherRegResponse)
def update_other_reg(
    reg_id: uuid.UUID,
    body:   OtherRegUpdate,
    db:     Session = Depends(get_db),
    _:      User    = Depends(get_current_user),
):
    r = db.query(OtherRegistration).filter(OtherRegistration.id == reg_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Registration not found")
    data = _encrypt(body.model_dump(exclude_none=True))
    for field, value in data.items():
        setattr(r, field, value)
    db.commit()
    db.refresh(r)
    return _decrypt(r)


@router.delete("/{reg_id}", status_code=204)
def delete_other_reg(
    reg_id: uuid.UUID,
    db:     Session = Depends(get_db),
    _:      User    = Depends(get_current_user),
):
    r = db.query(OtherRegistration).filter(OtherRegistration.id == reg_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Registration not found")
    db.delete(r)
    db.commit()
