# My Doctors Screen — Test Scenarios

**Screen:** `apps/mobile/app/(tabs)/doctors.tsx`  
**Access:** Patient role → Profile tab → "My Doctors" button → `/(tabs)/doctors`  
**Test seeds required:** `003_rich_patient_history.sql` + `004_mydoctors_test_scenarios.sql` (both applied)

---

## Test Users & Expected States

### Scenario A — Empty state (no linked doctors)
**How to trigger:** Register a fresh patient via receptionist (`/patients/new`) and log in with that account.  
**Expected UI:**
- "My Doctors" tab shows count `(0)` — no number badge
- No "ACTIVE ACCESS" or "REVOKED" section headings
- Large empty state card: 👨‍⚕️ "No doctor relationships yet" + explanation text
- Green privacy banner still visible at top

---

### Scenario B — Ravi Kumar: 1 Active + 2 Revoked
**Login:** `patient01@gmail.com` / `Ayush@2026!`

| Doctor | Specialisation | Status | Full History |
|---|---|---|---|
| Dr. Priya Nair | Homeopathy | ACTIVE | ✅ YES |
| Dr. Arjun Sharma | Ayurveda | REVOKED | No |
| Dr. Meena Pillai | Yoga | REVOKED | No |

**Expected UI — "My Doctors" tab:**
- Tab label: **My Doctors (1)** (active count only)
- **ACTIVE ACCESS** section (1 card):
  - Dr. Priya Nair — Homeopathy
  - Blue "Full history access" 👁 badge visible
  - "Revoke Access" button (red border)
  - Green status dot
- **REVOKED** section (2 cards, dimmed):
  - Dr. Arjun Sharma — "Revoked" date
  - Dr. Meena Pillai — "Revoked" date
  - "Re-grant Access" button (green border) on each
  - Grey status dot

**Actions to test:**
1. ✅ Tap **Revoke Access** on Dr. Priya Nair → confirm dialog appears → tap "Revoke" → card moves to REVOKED section instantly
2. ✅ Tap **Re-grant Access** on Dr. Arjun Sharma → no dialog → card moves to ACTIVE ACCESS instantly (no full history badge because share_full_history=false)
3. ✅ Pull-to-refresh → data reloads correctly

---

### Scenario C — Ananya Krishnan: 1 Active + 1 Revoked
**Login:** `patient02@gmail.com` / `Ayush@2026!`

| Doctor | Specialisation | Status | Full History |
|---|---|---|---|
| Dr. Meena Pillai | Yoga | ACTIVE | ✅ YES |
| Dr. Venkat Rao | Siddha | REVOKED | No |

**Expected UI:**
- Tab: **My Doctors (1)**
- **ACTIVE ACCESS**: Dr. Meena Pillai with Full History badge + Revoke button
- **REVOKED**: Dr. Venkat Rao with Re-grant button

**Actions to test:**
1. ✅ Re-grant Dr. Venkat Rao → both doctors now ACTIVE → tab shows **(2)**
2. ✅ Revoke Dr. Meena Pillai from that state → back to 1 active + 1 revoked

---

### Scenario D — Mohan Pillai: 2 Active (different history access levels)
**Login:** `patient03@gmail.com` / `Ayush@2026!`

| Doctor | Specialisation | Status | Full History |
|---|---|---|---|
| Dr. Venkat Rao | Siddha | ACTIVE | ✅ YES |
| Dr. Suresh Kumar | Unani | ACTIVE | ❌ NO |

**Expected UI:**
- Tab: **My Doctors (2)**
- **ACTIVE ACCESS** section (2 cards):
  - Dr. Venkat Rao: Full History badge 👁 visible
  - Dr. Suresh Kumar: **no badge** (partial history only) 
  - Both have green status dot + "Revoke Access" button
- **No REVOKED section** (no heading rendered when list is empty)

**Critical check:** The Full History badge must be **absent** on Dr. Suresh Kumar's card. This validates the `share_full_history` conditional render in `ConsentCard`.

**Actions to test:**
1. ✅ Revoke Dr. Venkat Rao → moves to REVOKED section → tab shows **(1)**
2. ✅ Revoke Dr. Suresh Kumar → both revoked → tab shows **(0)**, REVOKED section shows 2 cards
3. ✅ Re-grant both → back to 2 active

---

## What the "Full History Access" Badge Controls

This is a **display flag** in the consent record. It does NOT change in the mobile doctors.tsx screen — the patient consented to this level when the doctor first requested access (via the consultation flow). The patient can:

- **Revoke** (removes all access immediately)
- **Re-grant** (restores access at the same level that was last set — `share_full_history` is unchanged by re-grant)

To test what a doctor sees with vs without full history: log in as the doctor and check `/patients/[id]` — the web view respects this flag.

---

## Actions Test Matrix

| Action | Where | Expected result |
|---|---|---|
| Tap "My Doctors" on Profile screen | Profile tab | Navigates to `/(tabs)/doctors` |
| "My Doctors" sub-tab is default | Doctors screen | "My Doctors" tab selected, not "Find Near Me" |
| Active count in tab label | My Doctors tab label | Shows `(N)` where N = ACTIVE consents only |
| Pull-to-refresh | My Doctors tab | Reloads from Supabase |
| Tap Revoke → Cancel | Confirmation dialog | Row stays in ACTIVE section |
| Tap Revoke → Confirm | Confirmation dialog | Row moves to REVOKED immediately |
| Tap Re-grant | Directly (no dialog) | Row moves to ACTIVE immediately |
| Revoke the last active | After revoke | ACTIVE section disappears entirely |
| Re-grant the last revoked | After re-grant | REVOKED section disappears entirely |

---

## Edge Cases to Verify

| Edge case | How to test | Expected |
|---|---|---|
| No internet during revoke | Airplane mode → tap Revoke | Alert: error message shown, row unchanged |
| Duplicate consent (same doctor) | DB constraint `UNIQUE (patient_id, doctor_id)` | Only one row ever exists per doctor |
| Re-grant preserves share_full_history | Re-grant Ravi's revoked Arjun Sharma row | No Full History badge (was false when revoked) |
| Multiple revokes in quick succession | Tap two Revoke buttons fast | Each revoke fires independently; both succeed |

---

## Quick SQL to Reset Test Data

If you need to reset consents to their seeded state after testing:

```sql
-- Reset Ravi Kumar's consents
UPDATE patient_doctor_consent SET status='REVOKED', revoked_at=CURRENT_DATE-18 
  WHERE patient_id='e1000000-0000-0000-0000-000000000001' 
    AND doctor_id='d1000000-0000-0000-0000-000000000001';
UPDATE patient_doctor_consent SET status='ACTIVE', revoked_at=NULL, consented_at=CURRENT_DATE-14
  WHERE patient_id='e1000000-0000-0000-0000-000000000001' 
    AND doctor_id='d1000000-0000-0000-0000-000000000002';

-- Reset Ananya Krishnan's consents
UPDATE patient_doctor_consent SET status='REVOKED', revoked_at=CURRENT_DATE-12
  WHERE patient_id='e1000000-0000-0000-0000-000000000002'
    AND doctor_id='d1000000-0000-0000-0000-000000000003';
UPDATE patient_doctor_consent SET status='ACTIVE', revoked_at=NULL
  WHERE patient_id='e1000000-0000-0000-0000-000000000002'
    AND doctor_id='d1000000-0000-0000-0000-000000000004';

-- Reset Mohan Pillai's consents
UPDATE patient_doctor_consent SET status='ACTIVE', revoked_at=NULL
  WHERE patient_id='e1000000-0000-0000-0000-000000000003';
```
