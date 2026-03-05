from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from database import get_db
from models import Director, Client
from schemas import DirectorCreate, DirectorUpdate, DirectorResponse
from auth import get_current_user
from models import User

router = APIRouter(prefix="/directors", tags=["Directors"])


def _build_response(d: Director) -> dict:
    return {
        "company_client_id":    d.company_client_id,
        "individual_client_id": d.individual_client_id,
        "din":                  d.individual.din if d.individual else None,
        "individual_name":      d.individual.legal_name if d.individual else None,
        "company_name":         d.company.legal_name if d.company else None,
        "designation":          d.designation,
        "date_of_appointment":  d.date_of_appointment,
        "date_of_cessation":    d.date_of_cessation,
        "is_active":            d.is_active,
        "is_kmp":               d.is_kmp,
        "notes":                d.notes,
        "created_at":           d.created_at,
        "updated_at":           d.updated_at,
    }


@router.get("", response_model=list[DirectorResponse])
def list_directors(
    company_client_id:    uuid.UUID | None = None,
    individual_client_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    _:  User    = Depends(get_current_user),
):
    q = db.query(Director)
    if company_client_id:
        q = q.filter(Director.company_client_id == company_client_id)
    if individual_client_id:
        q = q.filter(Director.individual_client_id == individual_client_id)
    return [_build_response(d) for d in q.all()]


@router.post("", response_model=DirectorResponse, status_code=201)
def create_director(
    body: DirectorCreate,
    db:   Session = Depends(get_db),
    _:    User    = Depends(get_current_user),
):
    existing = db.query(Director).filter(
        Director.company_client_id == body.company_client_id,
        Director.individual_client_id == body.individual_client_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This director-company relationship already exists")
    d = Director(**body.model_dump())
    db.add(d)
    db.commit()
    db.refresh(d)
    return _build_response(d)


@router.put("/{company_id}/{individual_id}", response_model=DirectorResponse)
def update_director(
    company_id:    uuid.UUID,
    individual_id: uuid.UUID,
    body:          DirectorUpdate,
    db:            Session = Depends(get_db),
    _:             User    = Depends(get_current_user),
):
    d = db.query(Director).filter(
        Director.company_client_id == company_id,
        Director.individual_client_id == individual_id,
    ).first()
    if not d:
        raise HTTPException(status_code=404, detail="Director record not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(d, field, value)
    db.commit()
    db.refresh(d)
    return _build_response(d)


@router.delete("/{company_id}/{individual_id}", status_code=204)
def delete_director(
    company_id:    uuid.UUID,
    individual_id: uuid.UUID,
    db:            Session = Depends(get_db),
    _:             User    = Depends(get_current_user),
):
    d = db.query(Director).filter(
        Director.company_client_id == company_id,
        Director.individual_client_id == individual_id,
    ).first()
    if not d:
        raise HTTPException(status_code=404, detail="Director record not found")
    db.delete(d)
    db.commit()
