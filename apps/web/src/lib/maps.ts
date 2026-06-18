/**
 * Address / Maps abstraction layer
 * Phase 1: MapMyIndia (Mappls) — India
 * Phase 2+: Swap PROVIDER to 'google' — no other changes needed
 */

const PROVIDER = process.env.NEXT_PUBLIC_MAPS_PROVIDER ?? 'mappls'

export interface AddressSuggestion {
  placeName: string
  placeId: string
  city: string
  district: string
  state: string
  pincode: string
  lat: number | null
  lng: number | null
}

// MapMyIndia Autosuggest
async function mapplsSuggest(query: string): Promise<AddressSuggestion[]> {
  const token = process.env.NEXT_PUBLIC_MAPPLS_ACCESS_TOKEN
  if (!token) return []
  const res = await fetch(
    `https://atlas.mappls.com/api/places/search/json?query=${encodeURIComponent(query)}&region=IND&access_token=${token}`
  )
  const data = await res.json()
  return (data.suggestedLocations ?? []).map((s: Record<string, string>) => ({
    placeName: s.placeName ?? s.alternateName ?? '',
    placeId: s.eLoc ?? '',
    city: s.city ?? '',
    district: s.district ?? '',
    state: s.state ?? '',
    pincode: s.pincode ?? '',
    lat: s.latitude ? parseFloat(s.latitude) : null,
    lng: s.longitude ? parseFloat(s.longitude) : null,
  }))
}

// Google Maps Places Autocomplete (Phase 2+)
async function googleSuggest(query: string): Promise<AddressSuggestion[]> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) return []
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&components=country:in&key=${key}`
  )
  const data = await res.json()
  return (data.predictions ?? []).map((p: Record<string, string>) => ({
    placeName: p.description ?? '',
    placeId: p.place_id ?? '',
    city: '', district: '', state: '', pincode: '',
    lat: null, lng: null,
  }))
}

export async function suggestAddresses(query: string): Promise<AddressSuggestion[]> {
  if (query.length < 3) return []
  return PROVIDER === 'google' ? googleSuggest(query) : mapplsSuggest(query)
}

// Geocode a pincode to lat/long (MapMyIndia)
export async function geocodePincode(pincode: string): Promise<{ lat: number; lng: number } | null> {
  const token = process.env.NEXT_PUBLIC_MAPPLS_ACCESS_TOKEN
  if (!token || pincode.length !== 6) return null
  const res = await fetch(
    `https://atlas.mappls.com/api/places/search/json?query=${pincode}&region=IND&access_token=${token}`
  )
  const data = await res.json()
  const first = data.suggestedLocations?.[0]
  if (!first) return null
  return { lat: parseFloat(first.latitude), lng: parseFloat(first.longitude) }
}
