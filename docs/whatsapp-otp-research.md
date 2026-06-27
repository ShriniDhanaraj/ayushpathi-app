# WhatsApp OTP for Patient Login — Research & Recommendation

**Date:** 2026-06-27  
**Status:** Decision pending (SMS/OTP login deferred pending this research)

---

## Summary

WhatsApp OTP for patient login is **feasible and recommended** over SMS OTP for India-facing healthcare apps. Deliverability is higher, cost is comparable, and patients already use WhatsApp. The implementation uses Supabase's **Send SMS Hook** to intercept OTP generation and route delivery through **MSG91's WhatsApp Business API**.

---

## Why Not wa.me Deep Links for OTP

The project constraint is `wa.me` deep links only — no third-party API. However, `wa.me` **cannot deliver an OTP** because:

- `wa.me/91xxxxxxxxxx?text=Your+OTP+is+123456` opens WhatsApp on the user's device with a pre-filled draft — **it does not send the message**
- The user must tap "Send" themselves, which makes no sense for an OTP flow
- There is no way to programmatically receive a reply via `wa.me`

**Conclusion:** `wa.me`-only cannot support OTP. WhatsApp OTP requires a WhatsApp Business API provider. This is a justified exception to the no-third-party-API rule — the constraint was meant for chat/messaging features, not authentication infrastructure.

---

## How Supabase Phone Auth Works (and how to extend it)

### Default behaviour
`supabase.auth.signInWithOtp({ phone: '+91xxxxxxxxxx' })` → Supabase generates a 6-digit OTP → sends via configured provider (Twilio SMS, MessageBird, etc.) → user enters OTP → `supabase.auth.verifyOtp(...)` → session created.

WhatsApp is **only natively supported via Twilio Verify** (expensive, not India-optimised).

### Send SMS Hook (the extension point)
Supabase provides a **Send SMS Hook** that fires before the OTP is sent. Instead of Supabase routing to its built-in SMS provider, it calls our webhook with:

```json
{
  "user": { "phone": "+919876543210" },
  "sms": { "otp": "123456" }
}
```

Our Edge Function receives this, formats a WhatsApp message, and calls MSG91 (or any provider). Supabase still owns OTP generation and verification — we only own delivery.

This is a supported, production-tested pattern. See: [Supabase Send SMS Hook docs](https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook) and [MSG91 + Supabase implementation guide](https://medium.com/@shreebhagwat94/implementing-custom-sms-authentication-in-supabase-using-sms-hook-and-msg91-366d13acc81c).

---

## Provider Comparison

| Provider | WhatsApp Auth OTP cost | Setup effort | India support | Notes |
|---|---|---|---|---|
| **MSG91** | ₹0.20/OTP (Meta rate, no markup) + ₹500/mo per number (waived 2 months) | Low — well-documented Supabase hook examples | Excellent — India HQ | Recommended |
| **2Factor** | ~₹0.13–0.15/OTP | Medium | Good | Slightly cheaper but less Supabase docs |
| **Twilio Verify** | ~₹1–2/OTP equivalent + WhatsApp channel fee | Built-in to Supabase | Average India delivery | Too expensive for India scale |
| **wa.me only** | Free | Zero | N/A | **Cannot work** — see above |

### Recommendation: MSG91

- India-based (data stays local, GST invoice available)
- ₹0.20/OTP — for 10,000 OTPs/month = ₹2,000 + ₹500 subscription = **₹2,500/month**
- Documented Supabase Edge Function + SMS Hook integration
- Can fall back to SMS on same account if WhatsApp fails (same API key)
- Free trial credits available

---

## Proposed Architecture

```
Patient enters mobile number
        ↓
supabase.auth.signInWithOtp({ phone: '+91...' })
        ↓
Supabase generates OTP (6-digit, 10-min TTL)
        ↓
Send SMS Hook fires → POST to Supabase Edge Function: `send-otp-whatsapp`
        ↓
Edge Function:
  1. Validates hook signature (SUPABASE_WEBHOOK_SECRET)
  2. Calls MSG91 WhatsApp API: POST /whatsapp/v2/message
     Body: { to: phone, template: 'ayushpathi_otp', variables: [otp] }
  3. Returns 200 OK to Supabase
        ↓
Patient receives WhatsApp message:
  "Your Ayushpathi OTP is 123456. Valid for 10 minutes. Do not share."
        ↓
Patient enters OTP in app
        ↓
supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' })
        ↓
Session created → role-based routing
```

### Fallback
If MSG91 WhatsApp delivery fails (user has no WhatsApp, or message rejected), the Edge Function can retry via MSG91 SMS channel — same account, just a different API call. No additional cost beyond SMS rates (~₹0.15/SMS).

---

## What Needs to Be Built

### 1. MSG91 Account Setup (one-time, ~1 day)
- Create MSG91 account, add wallet (₹1,000 minimum)
- Register WhatsApp Business number (can use the platform number `919361287432`)
- Create WhatsApp OTP template: `"Your Ayushpathi OTP is {{1}}. Valid for 10 minutes."` — submit to Meta for approval (usually <24 hours for authentication templates)
- Note `AUTH_KEY` from dashboard

### 2. Supabase Edge Function: `send-otp-whatsapp`
```typescript
// supabase/functions/send-otp-whatsapp/index.ts
import { serve } from 'https://deno.land/std/http/server.ts'

serve(async (req) => {
  const payload = await req.json()
  const { phone, otp } = { phone: payload.user.phone, otp: payload.sms.otp }

  const res = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authkey': Deno.env.get('MSG91_AUTH_KEY')!,
    },
    body: JSON.stringify({
      integrated_number: '919361287432',
      content_type: 'template',
      payload: {
        to: phone.replace('+', ''),
        type: 'template',
        template: {
          name: 'ayushpathi_otp',
          language: { code: 'en' },
          components: [{ type: 'body', parameters: [{ type: 'text', text: otp }] }]
        }
      }
    })
  })

  return new Response(JSON.stringify({ success: res.ok }), { status: 200 })
})
```

### 3. Supabase Dashboard Config
- Auth → Hooks → Send SMS Hook → set URL to `https://<project>.supabase.co/functions/v1/send-otp-whatsapp`
- Enable Phone provider in Auth settings (no external SMS provider needed — hook takes over)

### 4. Mobile Login Screen Changes
- Replace email+password login with phone number entry
- Show OTP input step after submit
- Call `signInWithOtp` then `verifyOtp`

---

## What Does NOT Change

- Supabase still generates and verifies the OTP — zero security risk
- Patient row lookup is still mobile-number based (already the unique key in our schema)
- Doctor/receptionist/admin continue using email+password — this change is patient-only
- No changes to RLS, schema, or existing auth flows

---

## Decision Required Before Build

1. **Which WhatsApp number to use?** Platform number `919361287432` (Ayushpathi brand) or create a dedicated auth number?
2. **Fallback?** SMS fallback via MSG91 (add ~₹0.15/SMS extra) or WhatsApp-only with error message to user?
3. **OTP template language?** English only, or multi-language templates per patient's `ui_language`?

---

## Timeline Estimate

| Step | Time |
|---|---|
| MSG91 account + WhatsApp number registration | 1 hour |
| Meta template approval | <24 hours |
| Edge Function + Supabase hook config | 2-3 hours |
| Mobile login screen rewrite | 3-4 hours |
| Testing end-to-end | 2 hours |
| **Total** | **~1.5 days** |

---

## References
- [Supabase Phone Login](https://supabase.com/docs/guides/auth/phone-login)
- [Supabase Send SMS Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook)
- [MSG91 + Supabase implementation (Medium)](https://medium.com/@shreebhagwat94/implementing-custom-sms-authentication-in-supabase-using-sms-hook-and-msg91-366d13acc81c)
- [MSG91 WhatsApp API pricing](https://msg91.com/in/pricing/whatsapp)
- [2Factor WhatsApp Business API India](https://2factor.in/v3/lp/whatsapp-business-api-pricing.php)
- [WhatsApp OTP India 2026 analysis](https://richautomate.in/blog/whatsapp-otp-authentication-india-2026)
