from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from database import get_db
from models import BankAccount
from schemas import BankAccountCreate, BankAccountUpdate, BankAccountResponse
from auth import get_current_user
from models import User
import crypto

router = APIRouter(prefix="/bank-accounts", tags=["Bank Accounts"])


def _encrypt(data: dict) -> dict:
    if data.get("net_banking_password"):
        data["net_banking_password"] = crypto.encrypt(data["net_banking_password"])
    return data


def _decrypt(b: BankAccount) -> BankAccount:
    if b.net_banking_password:
        b.net_banking_password = crypto.decrypt(b.net_banking_password)
    return b


@router.get("", response_model=list[BankAccountResponse])
def list_bank_accounts(
    client_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    _:  User    = Depends(get_current_user),
):
    q = db.query(BankAccount)
    if client_id:
        q = q.filter(BankAccount.client_id == client_id)
    return [_decrypt(b) for b in q.all()]


@router.post("", response_model=BankAccountResponse, status_code=201)
def create_bank_account(
    body: BankAccountCreate,
    db:   Session = Depends(get_db),
    _:    User    = Depends(get_current_user),
):
    data = _encrypt(body.model_dump())
    b = BankAccount(**data)
    db.add(b)
    db.commit()
    db.refresh(b)
    return _decrypt(b)


@router.get("/{account_id}", response_model=BankAccountResponse)
def get_bank_account(
    account_id: uuid.UUID,
    db:         Session = Depends(get_db),
    _:          User    = Depends(get_current_user),
):
    b = db.query(BankAccount).filter(BankAccount.id == account_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Bank account not found")
    return _decrypt(b)


@router.put("/{account_id}", response_model=BankAccountResponse)
def update_bank_account(
    account_id: uuid.UUID,
    body:       BankAccountUpdate,
    db:         Session = Depends(get_db),
    _:          User    = Depends(get_current_user),
):
    b = db.query(BankAccount).filter(BankAccount.id == account_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Bank account not found")
    data = _encrypt(body.model_dump(exclude_none=True))
    for field, value in data.items():
        setattr(b, field, value)
    db.commit()
    db.refresh(b)
    return _decrypt(b)


@router.delete("/{account_id}", status_code=204)
def delete_bank_account(
    account_id: uuid.UUID,
    db:         Session = Depends(get_db),
    _:          User    = Depends(get_current_user),
):
    b = db.query(BankAccount).filter(BankAccount.id == account_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Bank account not found")
    db.delete(b)
    db.commit()
