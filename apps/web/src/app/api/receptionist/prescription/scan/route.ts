/**
 * POST /api/receptionist/prescription/scan
 *
 * Accepts a base64-encoded image of a handwritten or printed prescription.
 * Calls Google Cloud Vision API (TEXT_DETECTION) to extract text, then
 * parses the text into a structured list of medicines.
 *
 * Requires env var: GOOGLE_CLOUD_VISION_API_KEY
 *
 * Body: { image_base64: string, mime_type?: string }
 * Returns: { raw_text: string, medicines: Medicine[], entry_method: "SCANNED" }
 */
import { NextRequest, NextResponse } from 'next/server'

interface Medicine {
  name: string
  dosage: string
  frequency: string
  duration: string
  notes: string
}

// Frequency normalisation map (common Indian prescription shorthands)
const FREQ_MAP: Record<string, string> = {
  'OD': 'Once daily', 'BD': 'Twice daily', 'TDS': 'Thrice daily', 'QDS': 'Four times daily',
  '1-0-1': 'Morning & night', '1-1-1': 'Thrice daily', '0-0-1': 'Night only',
  '1-0-0': 'Morning only', 'SOS': 'As needed', 'PRN': 'As needed',
  'HS': 'At bedtime', 'AC': 'Before meals', 'PC': 'After meals',
}

function normaliseFreq(raw: string): string {
  const upper = raw.trim().toUpperCase()
  return FREQ_MAP[upper] ?? raw.trim()
}

/**
 * Parse raw OCR text into structured medicine rows.
 * Handles common Indian prescription formats:
 *   Tab. Paracetamol 500mg - TDS - 5 days
 *   Ashwagandha Churna 3g / BD / 15 days
 *   1. Amoxicillin 250mg cap TDS × 7 days
 */
function parsePrescriptionText(text: string): Medicine[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const medicines: Medicine[] = []

  // Patterns
  const dosageRe   = /(\d+\.?\d*\s*(?:mg|g|ml|mcg|iu|tab|caps?|drops?|puffs?|units?))/i
  const freqRe     = /\b(OD|BD|TDS|QDS|1[-–]0[-–]1|1[-–]1[-–]1|0[-–]0[-–]1|1[-–]0[-–]0|SOS|PRN|HS|AC|PC|once|twice|thrice|four\s*times)\b/i
  const durationRe = /(\d+\s*(?:day|days|week|weeks|month|months))/i
  // Prefixes to strip
  const prefixRe   = /^[\d]+[\.\)]\s*|^(?:tab|cap|caps|capsule|tablet|syrup|syp|oint|drops?|inhaler|injection|inj|powder|pwd|churna|kwath|arishta|asava)\s*[\.:]?\s*/i

  for (const line of lines) {
    // Skip obviously non-medicine lines (header, date, Rx symbol, etc.)
    if (/^(rx|patient|dr\.|date|age:|weight:|s\/o|d\/o|w\/o|address|hospital|clinic)/i.test(line)) continue
    if (line.length < 4) continue

    const cleaned = line.replace(prefixRe, '').trim()
    if (!cleaned) continue

    // Must look like a medicine: has letters + maybe digits
    if (!/[a-zA-Z]{3}/.test(cleaned)) continue

    const dosageMatch   = cleaned.match(dosageRe)
    const freqMatch     = cleaned.match(freqRe)
    const durationMatch = cleaned.match(durationRe)

    // Extract name: text before the first dosage/frequency/duration indicator
    const firstIndicatorPos = Math.min(
      dosageMatch?.index   ?? Infinity,
      freqMatch?.index     ?? Infinity,
      durationMatch?.index ?? Infinity,
    )
    const name = (firstIndicatorPos === Infinity ? cleaned : cleaned.slice(0, firstIndicatorPos))
      .replace(/[-–/,]+$/, '').trim()

    if (!name || name.length < 3) continue

    medicines.push({
      name,
      dosage:    dosageMatch   ? dosageMatch[1].trim()              : '',
      frequency: freqMatch     ? normaliseFreq(freqMatch[1])        : '',
      duration:  durationMatch ? durationMatch[1].trim()            : '',
      notes:     '',
    })
  }

  return medicines
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OCR not configured. Set GOOGLE_CLOUD_VISION_API_KEY in environment.' },
      { status: 503 }
    )
  }

  let body: { image_base64?: string; mime_type?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { image_base64, mime_type = 'image/jpeg' } = body
  if (!image_base64) {
    return NextResponse.json({ error: 'image_base64 is required' }, { status: 400 })
  }

  // Call Google Cloud Vision API
  const visionRes = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: image_base64 },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
          imageContext: { languageHints: ['en', 'hi', 'ta', 'te', 'kn', 'ml'] },
        }],
      }),
    }
  )

  if (!visionRes.ok) {
    const err = await visionRes.json()
    return NextResponse.json({ error: 'Vision API error', detail: err }, { status: 502 })
  }

  const visionData = await visionRes.json()
  const rawText: string =
    visionData?.responses?.[0]?.fullTextAnnotation?.text ?? ''

  if (!rawText.trim()) {
    return NextResponse.json({
      raw_text: '',
      medicines: [],
      entry_method: 'SCANNED',
      warning: 'No text detected in image. Ensure the prescription is well-lit and in focus.',
    })
  }

  const medicines = parsePrescriptionText(rawText)

  return NextResponse.json({
    raw_text: rawText,
    medicines,
    entry_method: 'SCANNED',
  })
}
