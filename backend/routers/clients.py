from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import uuid

from database import get_db
from models import Client
from schemas import ClientCreate, ClientUpdate, ClientResponse, ClientListItem
from auth import get_current_user
from models import User
import crypto

router = APIRouter(prefix="/clients", tags=["Clients"])

# Fields that must be encrypted before storing
ENCRYPTED_FIELDS = [
    "mca_password", "dsc_token_password",
    "it_portal_password", "it_password_tds", "password_26as", "password_ais_tis",
    "traces_password_deductor", "traces_password_taxpayer",
]


def _encrypt_client(data: dict) -> dict:
    for f in ENCRYPTED_FIELDS:
        if data.get(f):
            data[f] = crypto.encrypt(data[f])
    return data


def _decrypt_client(client: Client) -> Client:
    for f in ENCRYPTED_FIELDS:
        val = getattr(client, f, None)
        if val:
            setattr(client, f, crypto.decrypt(val))
    return client


@router.get("", response_model=list[ClientListItem])
def list_clients(
    search:       Optional[str]  = Query(None, description="Search by name or PAN"),
    constitution: Optional[str]  = Query(None),
    is_active:    Optional[bool] = Query(None),
    is_direct:    Optional[bool] = Query(None),
    db:           Session        = Depends(get_db),
    _:            User           = Depends(get_current_user),
):
    q = db.query(Client)
    if search:
        like = f"%{search}%"
        q = q.filter(
            Client.display_name.ilike(like) |
            Client.legal_name.ilike(like) |
            Client.pan.ilike(like)
        )
    if constitution:
        q = q.filter(Client.constitution == constitution)
    if is_active is not None:
        q = q.filter(Client.is_active == is_active)
    if is_direct is not None:
        q = q.filter(Client.is_direct_client == is_direct)
    return q.order_by(Client.display_name).all()


@router.post("", response_model=ClientResponse, status_code=201)
def create_client(
    body: ClientCreate,
    db:   Session = Depends(get_db),
    _:    User    = Depends(get_current_user),
):
    if db.query(Client).filter(Client.pan == body.pan).first():
        raise HTTPException(status_code=400, detail="PAN already exists")
    data = _encrypt_client(body.model_dump())
    client = Client(**data)
    db.add(client)
    db.commit()
    db.refresh(client)
    return _decrypt_client(client)


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: uuid.UUID,
    db:        Session = Depends(get_db),
    _:         User    = Depends(get_current_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return _decrypt_client(client)


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: uuid.UUID,
    body:      ClientUpdate,
    db:        Session = Depends(get_db),
    _:         User    = Depends(get_current_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    data = _encrypt_client(body.model_dump(exclude_none=True))
    for field, value in data.items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    return _decrypt_client(client)


@router.delete("/{client_id}", status_code=204)
def deactivate_client(
    client_id: uuid.UUID,
    db:        Session = Depends(get_db),
    _:         User    = Depends(get_current_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    client.is_active = False
    db.commit()
