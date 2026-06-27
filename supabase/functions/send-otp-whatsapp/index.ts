/**
 * Supabase Edge Function: send-otp-whatsapp
 *
 * Registered as a Supabase Auth "Send SMS" hook.
 * Triggered whenever signInWithOtp({ phone }) is called.
 *
 * Payload from Supabase:
 *   { user_id, phone, otp, token_hash, email }
 *
 * Flow:
 *   1. Look up patient record by phone → get ui_language
 *   2. Build multilingual OTP message
 *   3. Send via MSG91 WhatsApp API (from platform number 919361287432)
 *   4. If MSG91 fails AND patient has email → email fallback via Resend
 *   5. Always return {} (success) so Supabase doesn't block auth
 *
 * Env vars (set in Supabase dashboard → Functions → send-otp-whatsapp → Secrets):
 *   MSG91_AUTH_KEY          — MSG91 API key
 *   MSG91_WA_SENDER         — WhatsApp sender number (919361287432)
 *   SUPABASE_URL            — auto-set by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — auto-set by Supabase
 *   RESEND_API_KEY          — (optional) Resend email API for fallback
 *
 * MSG91 WhatsApp template IDs — create one approved template per language
 * in the MSG91 portal (meta approval needed):
 *   MSG91_WA_TEMPLATE_ID_EN, MSG91_WA_TEMPLATE_ID_HI, MSG91_WA_TEMPLATE_ID_TA,
 *   MSG91_WA_TEMPLATE_ID_TE, MSG91_WA_TEMPLATE_ID_KN, MSG91_WA_TEMPLATE_ID_ML,
 *   MSG91_WA_TEMPLATE_ID_BN, MSG91_WA_TEMPLATE_ID_GU, MSG91_WA_TEMPLATE_ID_MR
 *   All fall back to _EN if not set.
 *
 * Deploy:
 *   supabase functions deploy send-otp-whatsapp --no-verify-jwt
 * Register hook:
 *   Supabase dashboard → Authentication → Hooks → Send SMS → Edge Function
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Per-language OTP message bodies ────────────────────────────────────────────
const OTP_MESSAGES: Record<string, (otp: string) => string> = {
  EN: (o) => `Your Ayushpathi verification code is *${o}*. Valid for 10 minutes. Do not share this code.`,
  HI: (o) => `आपका Ayushpathi सत्यापन कोड *${o}* है। 10 मिनट में वैध। इसे किसी के साथ साझा न करें।`,
  TA: (o) => `உங்கள் Ayushpathi சரிபார்ப்பு குறியீடு *${o}*. 10 நிமிடங்களுக்கு செல்லுபடியாகும். பகிர வேண்டாம்.`,
  TE: (o) => `మీ Ayushpathi వెరిఫికేషన్ కోడ్ *${o}*. 10 నిమిషాలు చెల్లుబాటు అవుతుంది. దీన్ని పంచుకోవద్దు.`,
  KN: (o) => `ನಿಮ್ಮ Ayushpathi ಪರಿಶೀಲನ ಕೋಡ್ *${o}*. 10 ನಿಮಿಷ ಮಾನ್ಯ. ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.`,
  ML: (o) => `നിങ്ങളുടെ Ayushpathi വെരിഫിക്കേഷൻ കോഡ് *${o}*. 10 മിനിറ്റ് മാത്രം. പങ്കുവെക്കരുത്.`,
  BN: (o) => `আপনার Ayushpathi যাচাই কোড *${o}*। ১০ মিনিটের জন্য বৈধ। শেয়ার করবেন না।`,
  GU: (o) => `તમારો Ayushpathi ચકાસણી કોડ *${o}* છે. 10 મિનિટ માટે માન્ય. શેર કરશો નહીં.`,
  MR: (o) => `तुमचा Ayushpathi सत्यापन कोड *${o}* आहे. 10 मिनिटांसाठी वैध. कोणालाही सांगू नका.`,
}

function getOtpMessage(lang: string, otp: string): string {
  const fn = OTP_MESSAGES[lang] ?? OTP_MESSAGES['EN']
  return fn(otp)
}

// ── MSG91 WhatsApp template ID per language ────────────────────────────────────
function getTemplateId(lang: string): string {
  const key = `MSG91_WA_TEMPLATE_ID_${lang}`
  return Deno.env.get(key) ?? Deno.env.get('MSG91_WA_TEMPLATE_ID_EN') ?? ''
}

// ── Send OTP via MSG91 WhatsApp ────────────────────────────────────────────────
async function sendViaWhatsApp(phone: string, otp: string, lang: string): Promise<boolean> {
  const authKey    = Deno.env.get('MSG91_AUTH_KEY') ?? ''
  const sender     = Deno.env.get('MSG91_WA_SENDER') ?? '919361287432'
  const templateId = getTemplateId(lang)

  if (!authKey) {
    console.warn('MSG91_AUTH_KEY not set — skipping WhatsApp send')
    return false
  }

  // Normalise phone: strip leading + and ensure 91 country code
  const normalised = phone.replace(/^\+/, '')

  const body = {
    integrated_number: sender,
    content_type: 'template',
    payload: {
      to: normalised,
      type: 'template',
      template: {
        name: templateId || 'ayushpathi_otp_en',
        language: { code: langToMeta(lang) },
        components: [{
          type: 'body',
          parameters: [{ type: 'text', text: otp }],
        }],
      },
    },
  }

  try {
    const res = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authkey': authKey,
      },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    console.log('MSG91 WA response:', JSON.stringify(json))
    return res.ok && json.type !== 'error'
  } catch (e) {
    console.error('MSG91 WA error:', e)
    return false
  }
}

// Map Ayushpathi lang code → Meta BCP-47
function langToMeta(lang: string): string {
  const MAP: Record<string, string> = {
    EN: 'en', HI: 'hi', TA: 'ta', TE: 'te', KN: 'kn',
    ML: 'ml', BN: 'bn', GU: 'gu', MR: 'mr',
    PA: 'pa', UR: 'ur', OR: 'or', AS: 'as', SA: 'sa',
  }
  return MAP[lang] ?? 'en'
}

// ── Email fallback via Resend ──────────────────────────────────────────────────
async function sendViaEmail(email: string, otp: string, lang: string): Promise<boolean> {
  const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''
  if (!resendKey || !email) return false

  const subject = lang === 'EN'
    ? 'Your Ayushpathi login code'
    : `Ayushpathi — ${otp}`

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2 style="color:#1a6b3a">🌿 Ayushpathi</h2>
      <p style="font-size:16px">${getOtpMessage(lang, otp).replace(/\*/g, '<b>').replace(/\*/g, '</b>')}</p>
      <div style="background:#f0f7f4;border-radius:8px;padding:20px;text-align:center;margin:24px 0">
        <span style="font-size:32px;font-weight:700;color:#1a6b3a;letter-spacing:8px">${otp}</span>
      </div>
      <p style="font-size:12px;color:#888">This code was requested via your Ayushpathi mobile app.
      If you did not request this, please ignore this email.</p>
    </div>
  `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'Ayushpathi <noreply@rasbros.com>',
        to: [email],
        subject,
        html,
      }),
    })
    const json = await res.json()
    console.log('Resend email response:', JSON.stringify(json))
    return res.ok
  } catch (e) {
    console.error('Resend email error:', e)
    return false
  }
}

// ── Main handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const { user_id, phone, otp, email: hookEmail } = payload

    console.log(`OTP hook: user=${user_id} phone=${phone}`)

    // Look up patient's ui_language from patient table
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    let uiLang = 'EN'
    let patientEmail: string | null = hookEmail ?? null

    const { data: patient } = await supabaseAdmin
      .from('patient')
      .select('ui_language, email')
      .eq('auth_user_id', user_id)
      .maybeSingle()

    if (patient) {
      uiLang = patient.ui_language ?? 'EN'
      if (!patientEmail && patient.email) patientEmail = patient.email
    }

    console.log(`Patient lang=${uiLang} email=${patientEmail ? 'yes' : 'no'}`)

    // 1. Try WhatsApp delivery
    const waSent = await sendViaWhatsApp(phone, otp, uiLang)

    // 2. If WhatsApp failed → email fallback (if patient shared email)
    if (!waSent && patientEmail) {
      console.log('WhatsApp failed — trying email fallback')
      const emailSent = await sendViaEmail(patientEmail, otp, uiLang)
      console.log('Email fallback result:', emailSent)
    } else if (!waSent) {
      console.warn('WhatsApp failed and no email on record — OTP delivery failed')
    }

    // Always return success — do not block auth even if delivery fails.
    // Patient will see "resend" option after 60s in the app.
    return new Response(JSON.stringify({}), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-otp-whatsapp error:', err)
    // Still return success to Supabase — delivery errors should not block auth
    return new Response(JSON.stringify({}), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
