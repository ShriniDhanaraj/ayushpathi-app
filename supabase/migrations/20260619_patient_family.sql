-- ── Patient Family Relationship ───────────────────────────────
CREATE TABLE IF NOT EXISTS patient_family (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID        NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  related_patient_id  UUID        REFERENCES patient(id),  -- if family member is also registered
  relation_type       TEXT        NOT NULL CHECK (relation_type IN (
    'FATHER','MOTHER','SPOUSE','SIBLING','CHILD','GRANDPARENT','OTHER'
  )),
  first_name          TEXT,
  last_name           TEXT,
  date_of_birth       DATE,
  known_conditions    TEXT[]      DEFAULT '{}',
  allergies           TEXT[]      DEFAULT '{}',
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID,
  updated_by          UUID
);

CREATE INDEX IF NOT EXISTS patient_family_patient_idx ON patient_family(patient_id);

ALTER TABLE patient_family ENABLE ROW LEVEL SECURITY;

-- Patient can manage their own family entries
CREATE POLICY "patient_manage_own_family" ON patient_family
  FOR ALL USING (
    patient_id IN (SELECT id FROM patient WHERE auth_user_id = auth.uid())
  );

-- Service role (API) can access all
CREATE POLICY "service_role_family" ON patient_family
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE patient_family IS 'Family members of patients — critical for AYUSH hereditary diagnosis';
