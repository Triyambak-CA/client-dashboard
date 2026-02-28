-- =============================================================================
-- CA Client Management System — PostgreSQL Schema
-- =============================================================================
-- HOW TO RUN:
--   psql -U postgres -d ca_clients -f schema.sql
--
-- NOTE ON PASSWORDS:
--   All portal/credential password fields store ENCRYPTED values only.
--   The application layer is responsible for encrypting before saving
--   and decrypting on display. Never store plain text passwords.
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE constitution_type AS ENUM (
    'Individual', 'Partnership Firm', 'LLP', 'Company',
    'HUF', 'Trust', 'AOP', 'BOI'
);

CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other');

CREATE TYPE gst_registration_type AS ENUM (
    'Regular', 'Composition', 'QRMP', 'SEZ Unit',
    'SEZ Developer', 'Casual', 'Non-Resident'
);

CREATE TYPE designation_type AS ENUM (
    'Director', 'Managing Director', 'Whole-time Director',
    'Independent Director', 'Nominee Director', 'Additional Director'
);

CREATE TYPE holder_type AS ENUM (
    'Individual', 'Company', 'Trust', 'HUF', 'LLP'
);

CREATE TYPE share_type AS ENUM ('Equity', 'Preference', 'CCPS', 'OCPS');

CREATE TYPE partner_role AS ENUM (
    'Partner', 'Designated Partner', 'Managing Partner',
    'Sleeping Partner', 'Minor Partner'
);

CREATE TYPE bank_account_type AS ENUM (
    'Current', 'Savings', 'Cash Credit', 'Overdraft', 'EEFC'
);

CREATE TYPE epf_esi_type AS ENUM ('EPF', 'ESI');

CREATE TYPE other_reg_type AS ENUM (
    'MSME/Udyam', 'IEC', 'FSSAI', 'Professional Tax',
    'Shops & Estab', 'Trade License', 'Drug License',
    'Import Export Code', 'Others'
);

CREATE TYPE user_role AS ENUM ('admin', 'staff');


-- =============================================================================
-- TABLE: users  (login accounts for the CA firm staff)
-- =============================================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,          -- bcrypt hash, never plain text
    role            user_role NOT NULL DEFAULT 'staff',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- TABLE: clients  (Sheet 1 — Master — one row per entity)
-- =============================================================================

CREATE TABLE clients (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    pan                         TEXT NOT NULL UNIQUE,
    constitution                constitution_type NOT NULL,
    display_name                TEXT NOT NULL,
    legal_name                  TEXT NOT NULL,
    date_of_incorporation_birth DATE,
    cin_llpin                   TEXT,
    tan                         TEXT,
    is_direct_client            BOOLEAN NOT NULL DEFAULT TRUE,
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    is_on_retainer              BOOLEAN NOT NULL DEFAULT FALSE,
    client_since                DATE,

    -- Individual KYC — Personal Identity (NULL for non-individuals)
    father_name                 TEXT,
    mother_name                 TEXT,
    gender                      gender_type,
    nationality                 TEXT DEFAULT 'Indian',

    -- Individual KYC — Numbers
    aadhaar_no                  TEXT,           -- store masked, e.g. XXXX-XXXX-5678
    din                         TEXT,
    passport_no                 TEXT,
    passport_expiry             DATE,

    -- Individual KYC — MCA v3
    mca_user_id                 TEXT,
    mca_password                TEXT,           -- encrypted

    -- Individual KYC — DSC
    dsc_provider                TEXT,
    dsc_expiry_date             DATE,
    dsc_token_password          TEXT,           -- encrypted

    -- Contact
    primary_phone               TEXT,
    secondary_phone             TEXT,
    primary_email               TEXT,
    secondary_email             TEXT,

    -- Address
    address_line1               TEXT,
    address_line2               TEXT,
    city                        TEXT,
    state                       TEXT,
    pin_code                    TEXT,

    -- IT Portal
    it_portal_user_id           TEXT,
    it_portal_password          TEXT,           -- encrypted
    it_portal_user_id_tds       TEXT,
    it_password_tds             TEXT,           -- encrypted
    password_26as               TEXT,           -- encrypted
    password_ais_tis            TEXT,           -- encrypted

    -- TRACES
    traces_user_id_deductor     TEXT,
    traces_password_deductor    TEXT,           -- encrypted
    traces_user_id_taxpayer     TEXT,
    traces_password_taxpayer    TEXT,           -- encrypted

    -- Notes
    notes                       TEXT,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX idx_clients_pan            ON clients (pan);
CREATE INDEX idx_clients_constitution   ON clients (constitution);
CREATE INDEX idx_clients_display_name   ON clients (display_name);
CREATE INDEX idx_clients_is_active      ON clients (is_active);
CREATE INDEX idx_clients_din            ON clients (din) WHERE din IS NOT NULL;
CREATE INDEX idx_clients_tan            ON clients (tan) WHERE tan IS NOT NULL;


-- =============================================================================
-- TABLE: gst_registrations  (Sheet 2 — one row per GSTIN)
-- =============================================================================

CREATE TABLE gst_registrations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,

    -- Registration Details
    gstin               TEXT NOT NULL UNIQUE,
    state               TEXT,
    state_code          CHAR(2),
    registration_type   gst_registration_type,
    registration_date   DATE,
    cancellation_date   DATE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,

    -- GST Portal Credentials
    gst_user_id         TEXT,
    gst_password        TEXT,           -- encrypted

    -- E-Way Bill
    ewb_user_id         TEXT,
    ewb_password        TEXT,           -- encrypted
    ewb_api_user_id     TEXT,
    ewb_api_password    TEXT,           -- encrypted

    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gst_client_id ON gst_registrations (client_id);
CREATE INDEX idx_gst_gstin     ON gst_registrations (gstin);


-- =============================================================================
-- TABLE: gst_signatories  (multiple authorised signatories per GSTIN)
-- =============================================================================

CREATE TABLE gst_signatories (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gst_registration_id     UUID NOT NULL REFERENCES gst_registrations (id) ON DELETE CASCADE,
    signatory_client_id     UUID NOT NULL REFERENCES clients (id),
    -- name and PAN are auto-fetched from the linked client record at query time
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (gst_registration_id, signatory_client_id)
);

CREATE INDEX idx_gst_sig_registration ON gst_signatories (gst_registration_id);
CREATE INDEX idx_gst_sig_client       ON gst_signatories (signatory_client_id);


-- =============================================================================
-- TABLE: directors  (Sheet 3 — links Individual ↔ Company)
-- =============================================================================

CREATE TABLE directors (
    company_client_id       UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
    individual_client_id    UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
    -- DIN is fetched from clients.din of the individual at query time
    designation             designation_type NOT NULL,
    date_of_appointment     DATE,
    date_of_cessation       DATE,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    is_kmp                  BOOLEAN NOT NULL DEFAULT FALSE,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (company_client_id, individual_client_id)
);

CREATE INDEX idx_directors_company    ON directors (company_client_id);
CREATE INDEX idx_directors_individual ON directors (individual_client_id);


-- =============================================================================
-- TABLE: shareholders  (Sheet 4)
-- =============================================================================

CREATE TABLE shareholders (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),   -- Shareholding Record ID
    company_client_id           UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
    holder_type                 holder_type NOT NULL,
    individual_client_id        UUID REFERENCES clients (id),       -- fill if holder_type = Individual
    holding_entity_client_id    UUID REFERENCES clients (id),       -- fill if holder_type = Company/Trust/LLP/HUF
    -- holder name and PAN are auto-fetched from the linked client at query time
    share_type                  share_type,
    number_of_shares            INTEGER,
    face_value                  NUMERIC(12, 2),
    percentage                  NUMERIC(5, 2),
    date_acquired               DATE,
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    notes                       TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shareholders_company    ON shareholders (company_client_id);
CREATE INDEX idx_shareholders_individual ON shareholders (individual_client_id) WHERE individual_client_id IS NOT NULL;
CREATE INDEX idx_shareholders_entity     ON shareholders (holding_entity_client_id) WHERE holding_entity_client_id IS NOT NULL;


-- =============================================================================
-- TABLE: partners  (Sheet 5 — links Individual ↔ Firm/LLP)
-- =============================================================================

CREATE TABLE partners (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),   -- Partnership Record ID
    firm_llp_client_id      UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
    individual_client_id    UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
    role                    partner_role NOT NULL,
    profit_sharing_ratio    NUMERIC(5, 2),
    capital_contribution    NUMERIC(15, 2),
    date_of_joining         DATE,
    date_of_exit            DATE,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partners_firm       ON partners (firm_llp_client_id);
CREATE INDEX idx_partners_individual ON partners (individual_client_id);


-- =============================================================================
-- TABLE: bank_accounts  (Sheet 6)
-- =============================================================================

CREATE TABLE bank_accounts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id               UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
    bank_name               TEXT NOT NULL,
    account_number          TEXT NOT NULL,
    ifsc_code               TEXT NOT NULL,
    branch_name             TEXT,
    account_type            bank_account_type,
    is_primary              BOOLEAN NOT NULL DEFAULT FALSE,
    net_banking_user_id     TEXT,
    net_banking_password    TEXT,       -- encrypted
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bank_client_id ON bank_accounts (client_id);


-- =============================================================================
-- TABLE: epf_esi_registrations  (Sheet 7)
-- =============================================================================

CREATE TABLE epf_esi_registrations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
    registration_type   epf_esi_type NOT NULL,
    state               TEXT,
    establishment_code  TEXT NOT NULL,
    registration_date   DATE,
    cancellation_date   DATE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    portal_user_id      TEXT,
    portal_password     TEXT,           -- encrypted
    dsc_holder_name     TEXT,
    authorised_signatory TEXT,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_epf_esi_client_id ON epf_esi_registrations (client_id);


-- =============================================================================
-- TABLE: other_registrations  (Sheet 8 — MSME, IEC, FSSAI, etc.)
-- =============================================================================

CREATE TABLE other_registrations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           UUID NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
    registration_type   other_reg_type NOT NULL,
    registration_number TEXT NOT NULL,
    registration_date   DATE,
    valid_until         DATE,
    issuing_authority   TEXT,
    state_jurisdiction  TEXT,
    portal_user_id      TEXT,
    portal_password     TEXT,           -- encrypted
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_other_reg_client_id ON other_registrations (client_id);
CREATE INDEX idx_other_reg_valid_until ON other_registrations (valid_until) WHERE valid_until IS NOT NULL;


-- =============================================================================
-- AUTO-UPDATE updated_at on every row change
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON gst_registrations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON gst_signatories
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON directors
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON shareholders
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON bank_accounts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON epf_esi_registrations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON other_registrations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
