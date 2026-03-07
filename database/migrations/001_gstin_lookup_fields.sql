-- Migration: Add GST portal lookup fields to gst_registrations
-- Run this against the existing database before deploying the new backend.

ALTER TABLE gst_registrations
    ADD COLUMN IF NOT EXISTS trade_name          TEXT,
    ADD COLUMN IF NOT EXISTS gstin_status        TEXT,
    ADD COLUMN IF NOT EXISTS principal_address   TEXT,
    ADD COLUMN IF NOT EXISTS nature_of_business  TEXT,
    ADD COLUMN IF NOT EXISTS einvoice_applicable BOOLEAN,
    ADD COLUMN IF NOT EXISTS last_fetched_at     TIMESTAMPTZ;
