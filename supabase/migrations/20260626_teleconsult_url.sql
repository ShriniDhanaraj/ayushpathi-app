-- Migration: add teleconsult_url to appointment table
-- Generated: Session 10

ALTER TABLE appointment
  ADD COLUMN IF NOT EXISTS teleconsult_url TEXT;

COMMENT ON COLUMN appointment.teleconsult_url IS
  'Jitsi Meet URL auto-generated when appointment type is TELECONSULT';
