-- ============================================================
-- Migration: WhatsApp numbers on hospital and hospital_group
-- ============================================================

-- Each hospital has its own WhatsApp support number
-- Patients and doctors contact ONLY their hospital's WA
ALTER TABLE hospital
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- A hospital group (chain) may have a central WA for group-level admin use
-- Patients never reach this — only hospital admins escalating to group admin
ALTER TABLE hospital_group
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

COMMENT ON COLUMN hospital.whatsapp_number IS
  'Hospital support WhatsApp number (with country code, e.g. 919876543210). '
  'Patients and doctors contact this number. Never exposes group or platform WA.';

COMMENT ON COLUMN hospital_group.whatsapp_number IS
  'Group-level support WhatsApp. Used by hospital admins escalating to group admin. '
  'Patients and doctors never see this.';
