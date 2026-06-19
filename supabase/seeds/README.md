# Ayushpathi — Test Data Seeds

Run these in order in Supabase SQL Editor (postgres role).  
Password for all test users: `Ayush@2026!`

## Order of Execution

| File | When to Run | Description |
|---|---|---|
| `001_test_data.sql` | Once (already run) | Hospitals, doctors, patients, appointments, consultations, family members |
| `002_prescription_audit.sql` | After `20260619_prescription_audit.sql` migration | Prescription audit trail — DOCTOR_DIRECT + RECEPTIONIST entries |

## Addendum in 001_test_data.sql
The bottom section links doctors to lat/lng addresses for near-me search.
Run only after: `ALTER TABLE doctor ADD COLUMN IF NOT EXISTS address_id UUID REFERENCES address(id);`
(Migration: `supabase/migrations/20260619_doctor_address.sql`)

## Test Users
See HANDOFF_SESSION7.md for full table of all 17 users and their UUIDs.
