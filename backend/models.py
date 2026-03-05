"""
SQLAlchemy ORM models — mirror of database/schema.sql
All enum types reference existing PostgreSQL enums (create_type=False).
"""
import uuid
from datetime import date, datetime
from typing import Optional, List

from sqlalchemy import (
    Boolean, Date, Text, Numeric, Integer,
    ForeignKey, UniqueConstraint, func, Enum as SAEnum, CHAR
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP


class Base(DeclarativeBase):
    pass


def _enum(*values, name: str):
    """Reference an existing PostgreSQL ENUM type without re-creating it."""
    return SAEnum(*values, name=name, create_type=False)


# ── Users ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id:            Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name:          Mapped[str]       = mapped_column(Text, nullable=False)
    email:         Mapped[str]       = mapped_column(Text, nullable=False, unique=True)
    password_hash: Mapped[str]       = mapped_column(Text, nullable=False)
    role:          Mapped[str]       = mapped_column(_enum("admin", "staff", name="user_role"), nullable=False, default="staff")
    is_active:     Mapped[bool]      = mapped_column(Boolean, nullable=False, default=True)
    created_at:    Mapped[datetime]  = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at:    Mapped[datetime]  = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())


# ── Clients (Master) ─────────────────────────────────────────────────────────

class Client(Base):
    __tablename__ = "clients"

    id:                          Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pan:                         Mapped[str]             = mapped_column(Text, nullable=False, unique=True)
    constitution:                Mapped[str]             = mapped_column(_enum("Individual", "Partnership Firm", "LLP", "Company", "HUF", "Trust", "AOP", "BOI", name="constitution_type"), nullable=False)
    display_name:                Mapped[str]             = mapped_column(Text, nullable=False)
    legal_name:                  Mapped[str]             = mapped_column(Text, nullable=False)
    date_of_incorporation_birth: Mapped[Optional[date]]  = mapped_column(Date, nullable=True)
    cin_llpin:                   Mapped[Optional[str]]   = mapped_column(Text, nullable=True)
    tan:                         Mapped[Optional[str]]   = mapped_column(Text, nullable=True)
    is_direct_client:            Mapped[bool]            = mapped_column(Boolean, nullable=False, default=True)
    is_active:                   Mapped[bool]            = mapped_column(Boolean, nullable=False, default=True)
    is_on_retainer:              Mapped[bool]            = mapped_column(Boolean, nullable=False, default=False)
    client_since:                Mapped[Optional[date]]  = mapped_column(Date, nullable=True)

    # Individual KYC — Personal Identity
    father_name:       Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    mother_name:       Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    gender:            Mapped[Optional[str]]  = mapped_column(_enum("Male", "Female", "Other", name="gender_type"), nullable=True)
    nationality:       Mapped[Optional[str]]  = mapped_column(Text, nullable=True, default="Indian")
    aadhaar_no:        Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    din:               Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    passport_no:       Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    passport_expiry:   Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Individual KYC — MCA v3
    mca_user_id:  Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mca_password: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # encrypted

    # Individual KYC — DSC
    dsc_provider:       Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    dsc_expiry_date:    Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    dsc_token_password: Mapped[Optional[str]]  = mapped_column(Text, nullable=True)  # encrypted

    # Contact
    primary_phone:   Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    secondary_phone: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    primary_email:   Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    secondary_email: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Address
    address_line1: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    address_line2: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city:          Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    state:         Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pin_code:      Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # IT Portal
    it_portal_user_id:     Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    it_portal_password:    Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # encrypted
    it_portal_user_id_tds: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    it_password_tds:       Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # encrypted
    password_26as:         Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # encrypted
    password_ais_tis:      Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # encrypted

    # TRACES
    traces_user_id_deductor:  Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    traces_password_deductor: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # encrypted
    traces_user_id_taxpayer:  Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    traces_password_taxpayer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # encrypted

    notes:      Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime]      = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime]      = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    gst_registrations:    Mapped[List["GSTRegistration"]]    = relationship("GSTRegistration",    back_populates="client", cascade="all, delete-orphan")
    bank_accounts:        Mapped[List["BankAccount"]]        = relationship("BankAccount",        back_populates="client", cascade="all, delete-orphan")
    epf_esi_registrations: Mapped[List["EPFESIRegistration"]] = relationship("EPFESIRegistration", back_populates="client", cascade="all, delete-orphan")
    other_registrations:  Mapped[List["OtherRegistration"]]  = relationship("OtherRegistration",  back_populates="client", cascade="all, delete-orphan")


# ── GST Registrations ────────────────────────────────────────────────────────

class GSTRegistration(Base):
    __tablename__ = "gst_registrations"

    id:                Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id:         Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    gstin:             Mapped[str]            = mapped_column(Text, nullable=False, unique=True)
    state:             Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    state_code:        Mapped[Optional[str]]  = mapped_column(CHAR(2), nullable=True)
    registration_type: Mapped[Optional[str]]  = mapped_column(_enum("Regular", "Composition", "QRMP", "SEZ Unit", "SEZ Developer", "Casual", "Non-Resident", name="gst_registration_type"), nullable=True)
    registration_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    cancellation_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_active:         Mapped[bool]           = mapped_column(Boolean, nullable=False, default=True)
    gst_user_id:       Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    gst_password:      Mapped[Optional[str]]  = mapped_column(Text, nullable=True)  # encrypted
    ewb_user_id:       Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    ewb_password:      Mapped[Optional[str]]  = mapped_column(Text, nullable=True)  # encrypted
    ewb_api_user_id:   Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    ewb_api_password:  Mapped[Optional[str]]  = mapped_column(Text, nullable=True)  # encrypted
    notes:             Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    created_at:        Mapped[datetime]       = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at:        Mapped[datetime]       = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    client:     Mapped["Client"]               = relationship("Client", back_populates="gst_registrations")
    signatories: Mapped[List["GSTSignatory"]]  = relationship("GSTSignatory", back_populates="gst_registration", cascade="all, delete-orphan")


class GSTSignatory(Base):
    __tablename__ = "gst_signatories"

    id:                  Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    gst_registration_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("gst_registrations.id", ondelete="CASCADE"), nullable=False)
    signatory_client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    is_active:           Mapped[bool]      = mapped_column(Boolean, nullable=False, default=True)
    created_at:          Mapped[datetime]  = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at:          Mapped[datetime]  = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("gst_registration_id", "signatory_client_id"),)

    gst_registration: Mapped["GSTRegistration"] = relationship("GSTRegistration", back_populates="signatories")
    signatory_client: Mapped["Client"]          = relationship("Client", foreign_keys=[signatory_client_id])


# ── Directors ────────────────────────────────────────────────────────────────

class Director(Base):
    __tablename__ = "directors"

    company_client_id:    Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), primary_key=True)
    individual_client_id: Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), primary_key=True)
    designation:          Mapped[str]            = mapped_column(_enum("Director", "Managing Director", "Whole-time Director", "Independent Director", "Nominee Director", "Additional Director", name="designation_type"), nullable=False)
    date_of_appointment:  Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    date_of_cessation:    Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_active:            Mapped[bool]           = mapped_column(Boolean, nullable=False, default=True)
    is_kmp:               Mapped[bool]           = mapped_column(Boolean, nullable=False, default=False)
    notes:                Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    created_at:           Mapped[datetime]       = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at:           Mapped[datetime]       = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    company:    Mapped["Client"] = relationship("Client", foreign_keys=[company_client_id])
    individual: Mapped["Client"] = relationship("Client", foreign_keys=[individual_client_id])


# ── Shareholders ─────────────────────────────────────────────────────────────

class Shareholder(Base):
    __tablename__ = "shareholders"

    id:                       Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_client_id:        Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    holder_type:              Mapped[str]             = mapped_column(_enum("Individual", "Company", "Trust", "HUF", "LLP", name="holder_type"), nullable=False)
    individual_client_id:     Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    holding_entity_client_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True)
    share_type:               Mapped[Optional[str]]   = mapped_column(_enum("Equity", "Preference", "CCPS", "OCPS", name="share_type"), nullable=True)
    number_of_shares:         Mapped[Optional[int]]   = mapped_column(Integer, nullable=True)
    face_value:               Mapped[Optional[float]] = mapped_column(Numeric(12, 2), nullable=True)
    percentage:               Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    date_acquired:            Mapped[Optional[date]]  = mapped_column(Date, nullable=True)
    is_active:                Mapped[bool]            = mapped_column(Boolean, nullable=False, default=True)
    notes:                    Mapped[Optional[str]]   = mapped_column(Text, nullable=True)
    created_at:               Mapped[datetime]        = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at:               Mapped[datetime]        = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    company:        Mapped["Client"]           = relationship("Client", foreign_keys=[company_client_id])
    individual:     Mapped[Optional["Client"]] = relationship("Client", foreign_keys=[individual_client_id])
    holding_entity: Mapped[Optional["Client"]] = relationship("Client", foreign_keys=[holding_entity_client_id])


# ── Partners ─────────────────────────────────────────────────────────────────

class Partner(Base):
    __tablename__ = "partners"

    id:                   Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    firm_llp_client_id:   Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    individual_client_id: Mapped[uuid.UUID]       = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    role:                 Mapped[str]             = mapped_column(_enum("Partner", "Designated Partner", "Managing Partner", "Sleeping Partner", "Minor Partner", name="partner_role"), nullable=False)
    profit_sharing_ratio: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    capital_contribution: Mapped[Optional[float]] = mapped_column(Numeric(15, 2), nullable=True)
    date_of_joining:      Mapped[Optional[date]]  = mapped_column(Date, nullable=True)
    date_of_exit:         Mapped[Optional[date]]  = mapped_column(Date, nullable=True)
    is_active:            Mapped[bool]            = mapped_column(Boolean, nullable=False, default=True)
    notes:                Mapped[Optional[str]]   = mapped_column(Text, nullable=True)
    created_at:           Mapped[datetime]        = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at:           Mapped[datetime]        = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    firm_llp:   Mapped["Client"] = relationship("Client", foreign_keys=[firm_llp_client_id])
    individual: Mapped["Client"] = relationship("Client", foreign_keys=[individual_client_id])


# ── Bank Accounts ─────────────────────────────────────────────────────────────

class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id:                   Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id:            Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    bank_name:            Mapped[str]            = mapped_column(Text, nullable=False)
    account_number:       Mapped[str]            = mapped_column(Text, nullable=False)
    ifsc_code:            Mapped[str]            = mapped_column(Text, nullable=False)
    branch_name:          Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    account_type:         Mapped[Optional[str]]  = mapped_column(_enum("Current", "Savings", "Cash Credit", "Overdraft", "EEFC", name="bank_account_type"), nullable=True)
    is_primary:           Mapped[bool]           = mapped_column(Boolean, nullable=False, default=False)
    net_banking_user_id:  Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    net_banking_password: Mapped[Optional[str]]  = mapped_column(Text, nullable=True)  # encrypted
    notes:                Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    created_at:           Mapped[datetime]       = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at:           Mapped[datetime]       = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    client: Mapped["Client"] = relationship("Client", back_populates="bank_accounts")


# ── EPF/ESI Registrations ────────────────────────────────────────────────────

class EPFESIRegistration(Base):
    __tablename__ = "epf_esi_registrations"

    id:                   Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id:            Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    registration_type:    Mapped[str]            = mapped_column(_enum("EPF", "ESI", name="epf_esi_type"), nullable=False)
    state:                Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    establishment_code:   Mapped[str]            = mapped_column(Text, nullable=False)
    registration_date:    Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    cancellation_date:    Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_active:            Mapped[bool]           = mapped_column(Boolean, nullable=False, default=True)
    portal_user_id:       Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    portal_password:      Mapped[Optional[str]]  = mapped_column(Text, nullable=True)  # encrypted
    dsc_holder_name:      Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    authorised_signatory: Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    notes:                Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    created_at:           Mapped[datetime]       = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at:           Mapped[datetime]       = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    client: Mapped["Client"] = relationship("Client", back_populates="epf_esi_registrations")


# ── Other Registrations ───────────────────────────────────────────────────────

class OtherRegistration(Base):
    __tablename__ = "other_registrations"

    id:                  Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id:           Mapped[uuid.UUID]      = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    registration_type:   Mapped[str]            = mapped_column(_enum("MSME/Udyam", "IEC", "FSSAI", "Professional Tax", "Shops & Estab", "Trade License", "Drug License", "Import Export Code", "Others", name="other_reg_type"), nullable=False)
    registration_number: Mapped[str]            = mapped_column(Text, nullable=False)
    registration_date:   Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    valid_until:         Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    issuing_authority:   Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    state_jurisdiction:  Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    portal_user_id:      Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    portal_password:     Mapped[Optional[str]]  = mapped_column(Text, nullable=True)  # encrypted
    is_active:           Mapped[bool]           = mapped_column(Boolean, nullable=False, default=True)
    notes:               Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    created_at:          Mapped[datetime]       = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at:          Mapped[datetime]       = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())

    client: Mapped["Client"] = relationship("Client", back_populates="other_registrations")
