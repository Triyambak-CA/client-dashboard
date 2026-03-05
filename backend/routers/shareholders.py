from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from database import get_db
from models import Shareholder, Client
from schemas import ShareholderCreate, ShareholderUpdate, ShareholderResponse
from auth import get_current_user
from models import User

router = APIRouter(prefix="/shareholders", tags=["Shareholders"])


def _holder_client(sh: Shareholder) -> Client | None:
    if sh.holder_type == "Individual":
        return sh.individual
    return sh.holding_entity


def _build_response(sh: Shareholder) -> dict:
    holder = _holder_client(sh)
    data = {c.name: getattr(sh, c.name) for c in sh.__table__.columns}
    data["holder_name"] = holder.legal_name if holder else None
    data["holder_pan"]  = holder.pan if holder else None
    return data


@router.get("", response_model=list[ShareholderResponse])
def list_shareholders(
    company_client_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    _:  User    = Depends(get_current_user),
):
    q = db.query(Shareholder)
    if company_client_id:
        q = q.filter(Shareholder.company_client_id == company_client_id)
    return [_build_response(sh) for sh in q.all()]


@router.post("", response_model=ShareholderResponse, status_code=201)
def create_shareholder(
    body: ShareholderCreate,
    db:   Session = Depends(get_db),
    _:    User    = Depends(get_current_user),
):
    sh = Shareholder(**body.model_dump())
    db.add(sh)
    db.commit()
    db.refresh(sh)
    return _build_response(sh)


@router.get("/{sh_id}", response_model=ShareholderResponse)
def get_shareholder(
    sh_id: uuid.UUID,
    db:    Session = Depends(get_db),
    _:     User    = Depends(get_current_user),
):
    sh = db.query(Shareholder).filter(Shareholder.id == sh_id).first()
    if not sh:
        raise HTTPException(status_code=404, detail="Shareholder record not found")
    return _build_response(sh)


@router.put("/{sh_id}", response_model=ShareholderResponse)
def update_shareholder(
    sh_id: uuid.UUID,
    body:  ShareholderUpdate,
    db:    Session = Depends(get_db),
    _:     User    = Depends(get_current_user),
):
    sh = db.query(Shareholder).filter(Shareholder.id == sh_id).first()
    if not sh:
        raise HTTPException(status_code=404, detail="Shareholder record not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(sh, field, value)
    db.commit()
    db.refresh(sh)
    return _build_response(sh)


@router.delete("/{sh_id}", status_code=204)
def delete_shareholder(
    sh_id: uuid.UUID,
    db:    Session = Depends(get_db),
    _:     User    = Depends(get_current_user),
):
    sh = db.query(Shareholder).filter(Shareholder.id == sh_id).first()
    if not sh:
        raise HTTPException(status_code=404, detail="Shareholder record not found")
    db.delete(sh)
    db.commit()
