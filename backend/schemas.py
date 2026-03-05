"""
Pydantic v2 request / response schemas for every entity.

Convention:
  - <Entity>Create   — body for POST (create)
  - <Entity>Update   — body for PUT/PATCH (all fields optional)
  - <Entity>Response — what the API returns (includes id, timestamps)
  - <Entity>ListItem — slim version for list endpoints (no credentials)
"""
import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr


# ── Users ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name:     str
    email:    EmailStr
    password: str
    role:     str = "staff"


class UserUpdate(BaseModel):
    name:      Optional[str]  = None
    email:     Optional[EmailStr] = None
    password:  Optional[str]  = None
    role:      Optional[str]  = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id:         uuid.UUID
    name:       str
    email:      str
    role:       str
    is_active:  bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email:    str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         UserResponse


# ── Clients ───────────────────────────────────────────────────────────────────

class ClientCreate(BaseModel):
    # Identity
    pan:                         str
    constitution:                str
    display_name:                str
    legal_name:                  str
    date_of_incorporation_birth: Optional[date] = None
    cin_llpin:                   Optional[str]  = None
    tan:                         Optional[str]  = None
    is_direct_client:            bool           = True
    is_active:                   bool           = True
    is_on_retainer:              bool           = False
    client_since:                Optional[date] = None
    # Individual KYC
    father_name:        Optional[str]  = None
    mother_name:        Optional[str]  = None
    gender:             Optional[str]  = None
    nationality:        Optional[str]  = "Indian"
    aadhaar_no:         Optional[str]  = None
    din:                Optional[str]  = None
    passport_no:        Optional[str]  = None
    passport_expiry:    Optional[date] = None
    mca_user_id:        Optional[str]  = None
    mca_password:       Optional[str]  = None
    dsc_provider:       Optional[str]  = None
    dsc_expiry_date:    Optional[date] = None
    dsc_token_password: Optional[str]  = None
    # Contact
    primary_phone:   Optional[str] = None
    secondary_phone: Optional[str] = None
    primary_email:   Optional[str] = None
    secondary_email: Optional[str] = None
    # Address
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city:          Optional[str] = None
    state:         Optional[str] = None
    pin_code:      Optional[str] = None
    # IT Portal
    it_portal_user_id:     Optional[str] = None
    it_portal_password:    Optional[str] = None
    it_portal_user_id_tds: Optional[str] = None
    it_password_tds:       Optional[str] = None
    password_26as:         Optional[str] = None
    password_ais_tis:      Optional[str] = None
    # TRACES
    traces_user_id_deductor:  Optional[str] = None
    traces_password_deductor: Optional[str] = None
    traces_user_id_taxpayer:  Optional[str] = None
    traces_password_taxpayer: Optional[str] = None
    notes: Optional[str] = None


class ClientUpdate(BaseModel):
    pan:                         Optional[str]  = None
    constitution:                Optional[str]  = None
    display_name:                Optional[str]  = None
    legal_name:                  Optional[str]  = None
    date_of_incorporation_birth: Optional[date] = None
    cin_llpin:                   Optional[str]  = None
    tan:                         Optional[str]  = None
    is_direct_client:            Optional[bool] = None
    is_active:                   Optional[bool] = None
    is_on_retainer:              Optional[bool] = None
    client_since:                Optional[date] = None
    father_name:        Optional[str]  = None
    mother_name:        Optional[str]  = None
    gender:             Optional[str]  = None
    nationality:        Optional[str]  = None
    aadhaar_no:         Optional[str]  = None
    din:                Optional[str]  = None
    passport_no:        Optional[str]  = None
    passport_expiry:    Optional[date] = None
    mca_user_id:        Optional[str]  = None
    mca_password:       Optional[str]  = None
    dsc_provider:       Optional[str]  = None
    dsc_expiry_date:    Optional[date] = None
    dsc_token_password: Optional[str]  = None
    primary_phone:   Optional[str] = None
    secondary_phone: Optional[str] = None
    primary_email:   Optional[str] = None
    secondary_email: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city:          Optional[str] = None
    state:         Optional[str] = None
    pin_code:      Optional[str] = None
    it_portal_user_id:     Optional[str] = None
    it_portal_password:    Optional[str] = None
    it_portal_user_id_tds: Optional[str] = None
    it_password_tds:       Optional[str] = None
    password_26as:         Optional[str] = None
    password_ais_tis:      Optional[str] = None
    traces_user_id_deductor:  Optional[str] = None
    traces_password_deductor: Optional[str] = None
    traces_user_id_taxpayer:  Optional[str] = None
    traces_password_taxpayer: Optional[str] = None
    notes: Optional[str] = None


class ClientListItem(BaseModel):
    """Slim — used in list views, no credentials."""
    id:               uuid.UUID
    pan:              str
    constitution:     str
    display_name:     str
    legal_name:       str
    is_active:        bool
    is_direct_client: bool
    is_on_retainer:   bool
    primary_phone:    Optional[str] = None
    primary_email:    Optional[str] = None
    din:              Optional[str] = None
    created_at:       datetime

    model_config = ConfigDict(from_attributes=True)


class ClientResponse(ClientCreate):
    """Full detail — includes decrypted credentials."""
    id:         uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── GST Registrations ─────────────────────────────────────────────────────────

class GSTCreate(BaseModel):
    client_id:         uuid.UUID
    gstin:             str
    state:             Optional[str] = None
    state_code:        Optional[str] = None
    registration_type: Optional[str] = None
    registration_date: Optional[date] = None
    cancellation_date: Optional[date] = None
    is_active:         bool = True
    gst_user_id:       Optional[str] = None
    gst_password:      Optional[str] = None
    ewb_user_id:       Optional[str] = None
    ewb_password:      Optional[str] = None
    ewb_api_user_id:   Optional[str] = None
    ewb_api_password:  Optional[str] = None
    notes:             Optional[str] = None


class GSTUpdate(BaseModel):
    gstin:             Optional[str]  = None
    state:             Optional[str]  = None
    state_code:        Optional[str]  = None
    registration_type: Optional[str]  = None
    registration_date: Optional[date] = None
    cancellation_date: Optional[date] = None
    is_active:         Optional[bool] = None
    gst_user_id:       Optional[str]  = None
    gst_password:      Optional[str]  = None
    ewb_user_id:       Optional[str]  = None
    ewb_password:      Optional[str]  = None
    ewb_api_user_id:   Optional[str]  = None
    ewb_api_password:  Optional[str]  = None
    notes:             Optional[str]  = None


class GSTSignatoryInfo(BaseModel):
    """Signatory info returned inside a GST response — name & PAN from client record."""
    id:                  uuid.UUID
    signatory_client_id: uuid.UUID
    signatory_name:      Optional[str] = None
    signatory_pan:       Optional[str] = None
    is_active:           bool

    model_config = ConfigDict(from_attributes=True)


class GSTResponse(GSTCreate):
    id:          uuid.UUID
    signatories: list[GSTSignatoryInfo] = []
    created_at:  datetime
    updated_at:  datetime

    model_config = ConfigDict(from_attributes=True)


class GSTListItem(BaseModel):
    id:                uuid.UUID
    client_id:         uuid.UUID
    gstin:             str
    state:             Optional[str] = None
    registration_type: Optional[str] = None
    is_active:         bool

    model_config = ConfigDict(from_attributes=True)


class GSTSignatoryCreate(BaseModel):
    signatory_client_id: uuid.UUID


# ── Directors ─────────────────────────────────────────────────────────────────

class DirectorCreate(BaseModel):
    company_client_id:    uuid.UUID
    individual_client_id: uuid.UUID
    designation:          str
    date_of_appointment:  Optional[date] = None
    date_of_cessation:    Optional[date] = None
    is_active:            bool = True
    is_kmp:               bool = False
    notes:                Optional[str] = None


class DirectorUpdate(BaseModel):
    designation:         Optional[str]  = None
    date_of_appointment: Optional[date] = None
    date_of_cessation:   Optional[date] = None
    is_active:           Optional[bool] = None
    is_kmp:              Optional[bool] = None
    notes:               Optional[str]  = None


class DirectorResponse(BaseModel):
    company_client_id:    uuid.UUID
    individual_client_id: uuid.UUID
    din:                  Optional[str] = None   # fetched from individual client
    individual_name:      Optional[str] = None   # fetched from individual client
    company_name:         Optional[str] = None   # fetched from company client
    designation:          str
    date_of_appointment:  Optional[date] = None
    date_of_cessation:    Optional[date] = None
    is_active:            bool
    is_kmp:               bool
    notes:                Optional[str] = None
    created_at:           datetime
    updated_at:           datetime

    model_config = ConfigDict(from_attributes=True)


# ── Shareholders ──────────────────────────────────────────────────────────────

class ShareholderCreate(BaseModel):
    company_client_id:        uuid.UUID
    holder_type:              str
    individual_client_id:     Optional[uuid.UUID] = None
    holding_entity_client_id: Optional[uuid.UUID] = None
    share_type:               Optional[str]  = None
    number_of_shares:         Optional[int]  = None
    face_value:               Optional[float] = None
    percentage:               Optional[float] = None
    date_acquired:            Optional[date]  = None
    is_active:                bool = True
    notes:                    Optional[str] = None


class ShareholderUpdate(BaseModel):
    holder_type:              Optional[str]       = None
    individual_client_id:     Optional[uuid.UUID] = None
    holding_entity_client_id: Optional[uuid.UUID] = None
    share_type:               Optional[str]   = None
    number_of_shares:         Optional[int]   = None
    face_value:               Optional[float] = None
    percentage:               Optional[float] = None
    date_acquired:            Optional[date]  = None
    is_active:                Optional[bool]  = None
    notes:                    Optional[str]   = None


class ShareholderResponse(ShareholderCreate):
    id:           uuid.UUID
    holder_name:  Optional[str] = None   # fetched from linked client
    holder_pan:   Optional[str] = None   # fetched from linked client
    created_at:   datetime
    updated_at:   datetime

    model_config = ConfigDict(from_attributes=True)


# ── Partners ──────────────────────────────────────────────────────────────────

class PartnerCreate(BaseModel):
    firm_llp_client_id:   uuid.UUID
    individual_client_id: uuid.UUID
    role:                 str
    profit_sharing_ratio: Optional[float] = None
    capital_contribution: Optional[float] = None
    date_of_joining:      Optional[date]  = None
    date_of_exit:         Optional[date]  = None
    is_active:            bool = True
    notes:                Optional[str] = None


class PartnerUpdate(BaseModel):
    role:                 Optional[str]   = None
    profit_sharing_ratio: Optional[float] = None
    capital_contribution: Optional[float] = None
    date_of_joining:      Optional[date]  = None
    date_of_exit:         Optional[date]  = None
    is_active:            Optional[bool]  = None
    notes:                Optional[str]   = None


class PartnerResponse(PartnerCreate):
    id:               uuid.UUID
    individual_name:  Optional[str] = None   # fetched from linked client
    firm_name:        Optional[str] = None   # fetched from linked client
    created_at:       datetime
    updated_at:       datetime

    model_config = ConfigDict(from_attributes=True)


# ── Bank Accounts ─────────────────────────────────────────────────────────────

class BankAccountCreate(BaseModel):
    client_id:            uuid.UUID
    bank_name:            str
    account_number:       str
    ifsc_code:            str
    branch_name:          Optional[str] = None
    account_type:         Optional[str] = None
    is_primary:           bool = False
    net_banking_user_id:  Optional[str] = None
    net_banking_password: Optional[str] = None
    notes:                Optional[str] = None


class BankAccountUpdate(BaseModel):
    bank_name:            Optional[str]  = None
    account_number:       Optional[str]  = None
    ifsc_code:            Optional[str]  = None
    branch_name:          Optional[str]  = None
    account_type:         Optional[str]  = None
    is_primary:           Optional[bool] = None
    net_banking_user_id:  Optional[str]  = None
    net_banking_password: Optional[str]  = None
    notes:                Optional[str]  = None


class BankAccountResponse(BankAccountCreate):
    id:         uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── EPF/ESI Registrations ─────────────────────────────────────────────────────

class EPFESICreate(BaseModel):
    client_id:            uuid.UUID
    registration_type:    str
    state:                Optional[str]  = None
    establishment_code:   str
    registration_date:    Optional[date] = None
    cancellation_date:    Optional[date] = None
    is_active:            bool = True
    portal_user_id:       Optional[str] = None
    portal_password:      Optional[str] = None
    dsc_holder_name:      Optional[str] = None
    authorised_signatory: Optional[str] = None
    notes:                Optional[str] = None


class EPFESIUpdate(BaseModel):
    registration_type:    Optional[str]  = None
    state:                Optional[str]  = None
    establishment_code:   Optional[str]  = None
    registration_date:    Optional[date] = None
    cancellation_date:    Optional[date] = None
    is_active:            Optional[bool] = None
    portal_user_id:       Optional[str]  = None
    portal_password:      Optional[str]  = None
    dsc_holder_name:      Optional[str]  = None
    authorised_signatory: Optional[str]  = None
    notes:                Optional[str]  = None


class EPFESIResponse(EPFESICreate):
    id:         uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Other Registrations ───────────────────────────────────────────────────────

class OtherRegCreate(BaseModel):
    client_id:           uuid.UUID
    registration_type:   str
    registration_number: str
    registration_date:   Optional[date] = None
    valid_until:         Optional[date] = None
    issuing_authority:   Optional[str]  = None
    state_jurisdiction:  Optional[str]  = None
    portal_user_id:      Optional[str]  = None
    portal_password:     Optional[str]  = None
    is_active:           bool = True
    notes:               Optional[str]  = None


class OtherRegUpdate(BaseModel):
    registration_type:   Optional[str]  = None
    registration_number: Optional[str]  = None
    registration_date:   Optional[date] = None
    valid_until:         Optional[date] = None
    issuing_authority:   Optional[str]  = None
    state_jurisdiction:  Optional[str]  = None
    portal_user_id:      Optional[str]  = None
    portal_password:     Optional[str]  = None
    is_active:           Optional[bool] = None
    notes:               Optional[str]  = None


class OtherRegResponse(OtherRegCreate):
    id:         uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
