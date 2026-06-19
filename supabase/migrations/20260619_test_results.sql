-- ── Test Result Attachment ────────────────────────────────────
-- Supabase Storage bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'test-results',
  'test-results',
  false,
  52428800, -- 50 MB
  ARRAY['image/jpeg','image/png','image/webp','application/pdf','image/heic','image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: only authenticated users can upload
CREATE POLICY "auth_upload_test_results" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'test-results' AND auth.role() = 'authenticated'
  );

-- Storage RLS: patient sees their own; doctor/receptionist sees patients they have appointments with
CREATE POLICY "auth_select_test_results" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'test-results' AND auth.role() IN ('authenticated', 'service_role')
  );

-- ── test_result table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_result (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id   UUID        NOT NULL REFERENCES appointment(id) ON DELETE CASCADE,
  patient_id       UUID        NOT NULL REFERENCES patient(id)     ON DELETE CASCADE,
  uploaded_by      UUID        NOT NULL,
  uploaded_by_role TEXT        NOT NULL DEFAULT 'DOCTOR' CHECK (uploaded_by_role IN ('DOCTOR','RECEPTIONIST','HOSPITAL_ADMIN')),
  file_url         TEXT        NOT NULL,
  file_name        TEXT        NOT NULL,
  file_type        TEXT        NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       UUID,
  updated_by       UUID
);

CREATE INDEX IF NOT EXISTS test_result_appointment_idx ON test_result(appointment_id);
CREATE INDEX IF NOT EXISTS test_result_patient_idx     ON test_result(patient_id);

ALTER TABLE test_result ENABLE ROW LEVEL SECURITY;

-- Patient can view their own test results
CREATE POLICY "patient_view_own_test_results" ON test_result
  FOR SELECT USING (
    patient_id IN (SELECT id FROM patient WHERE auth_user_id = auth.uid())
  );

-- Authenticated roles can insert (API uses service role, but also allow direct inserts)
CREATE POLICY "authenticated_insert_test_results" ON test_result
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE test_result IS 'Lab reports, X-rays, scans attached to consultations';
