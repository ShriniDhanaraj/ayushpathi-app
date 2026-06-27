'use client'
import { useState, useEffect } from 'react'
import { LANGUAGES } from '@/lib/shared/languages'

const SPEC = [
  { code: '', label: 'All AYUSH' }, { code: 'AYU', label: 'Ayurveda' },
  { code: 'YOG', label: 'Yoga & Naturopathy' }, { code: 'UNA', label: 'Unani' },
  { code: 'SID', label: 'Siddha' }, { code: 'HOM', label: 'Homeopathy' },
]

interface NearbyDoctor {
  id: string; first_name: string; last_name: string
  ayush_specialization: string; years_of_experience: number
  languages_spoken: string[]; teleconsult_enabled: boolean
  teleconsult_fee: number; city: string; state: string; distance_km: number
}

const SPEC_LABELS: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy',
  UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}

const LANG_LABELS: Record<string, string> = Object.fromEntries(
  LANGUAGES.map(l => [l.code, `${l.nativeLabel} (${l.label})`])
)

// Geocode a free-text address (city, pincode, area) using OpenStreetMap Nominatim
async function geocodeAddress(query: string): Promise<{ lat: number; lng: number; display: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', India')}&format=json&limit=1&countrycodes=in`
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    const data = await res.json()
    if (!data?.length) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name }
  } catch {
    return null
  }
}

export default function NearMePage() {
  const [doctors, setDoctors]       = useState<NearbyDoctor[]>([])
  const [spec, setSpec]             = useState('')
  const [radius, setRadius]         = useState(10)
  const [langFilter, setLangFilter] = useState('')
  const [status, setStatus]         = useState<'idle' | 'locating' | 'geocoding' | 'loading' | 'done' | 'error'>('idle')
  const [coords, setCoords]         = useState<{ lat: number; lng: number } | null>(null)
  const [locationLabel, setLocationLabel] = useState('')   // human-readable label for what was used

  // Address fallback state
  const [showAddressInput, setShowAddressInput] = useState(false)
  const [addressQuery, setAddressQuery]         = useState('')
  const [geocodeError, setGeocodeError]         = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLang = sessionStorage.getItem('ayushpathi_ui_lang')
      if (storedLang && storedLang !== 'EN') setLangFilter(storedLang)
    }
  }, [])

  function locateByBrowser() {
    setStatus('locating')
    setShowAddressInput(false)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationLabel('your current location')
        setStatus('idle')
      },
      () => {
        // Location denied — surface address input automatically
        setStatus('error')
        setShowAddressInput(true)
      }
    )
  }

  async function locateByAddress() {
    if (!addressQuery.trim()) return
    setGeocodeError('')
    setStatus('geocoding')
    const result = await geocodeAddress(addressQuery)
    if (!result) {
      setGeocodeError('Could not find that location. Try a different pincode, area, or city name.')
      setStatus('error')
      return
    }
    setCoords({ lat: result.lat, lng: result.lng })
    setLocationLabel(addressQuery.trim())
    setStatus('idle')
  }

  async function search() {
    if (!coords) { locateByBrowser(); return }
    setStatus('loading'); setDoctors([])
    const params = new URLSearchParams({
      lat: String(coords.lat), lng: String(coords.lng),
      radius: String(radius),
      ...(spec ? { specialization: spec } : {}),
      ...(langFilter ? { language: langFilter } : {}),
    })
    const res = await fetch(`/api/doctors/near-me?${params}`)
    const data = await res.json()
    setDoctors(data.doctors ?? [])
    setStatus('done')
  }

  // Re-search when coords/filters change
  useEffect(() => { if (coords) search() }, [coords, spec, radius, langFilter])

  function resetLocation() {
    setCoords(null)
    setLocationLabel('')
    setStatus('idle')
    setShowAddressInput(false)
    setAddressQuery('')
    setGeocodeError('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <a href="/appointments/new" className="text-gray-400 hover:text-gray-600 text-sm">← Back</a>
        <span className="font-semibold text-gray-900">Doctors Near Me</span>
        {locationLabel && (
          <span className="text-xs text-gray-400 ml-auto">
            📍 {locationLabel}
            <button onClick={resetLocation} className="ml-2 text-brand-500 hover:underline">Change</button>
          </span>
        )}
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-5">

        {/* Filters — always visible once we have coords */}
        {coords && (
          <div className="card p-4 space-y-3">
            {/* Specialization pills */}
            <div className="flex gap-2 flex-wrap">
              {SPEC.map(s => (
                <button key={s.code + '_spec'} onClick={() => setSpec(s.code)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    spec === s.code
                      ? 'bg-brand-600 border-brand-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-brand-400'
                  }`}>{s.label}</button>
              ))}
            </div>

            {/* Language + Radius */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <span className="text-xs text-gray-500 whitespace-nowrap">Speaks</span>
                <select className="input text-sm flex-1" value={langFilter}
                  onChange={e => setLangFilter(e.target.value)}>
                  <option value="">Any language</option>
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.nativeLabel} ({l.label})</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Within</span>
                <select className="input w-24" value={radius}
                  onChange={e => setRadius(parseInt(e.target.value))}>
                  {[5, 10, 20, 50].map(r => <option key={r} value={r}>{r} km</option>)}
                </select>
              </div>
            </div>

            {langFilter && (
              <div className="flex items-center gap-2 text-xs text-brand-700 bg-brand-50 rounded-full px-3 py-1 w-fit">
                <span>🗣️ {LANG_LABELS[langFilter] ?? langFilter}</span>
                <button onClick={() => setLangFilter('')} className="text-brand-400 hover:text-brand-600 font-bold">✕</button>
              </div>
            )}
          </div>
        )}

        {/* Initial location prompt (no coords yet, no error) */}
        {status === 'idle' && !coords && !showAddressInput && (
          <div className="card p-8 text-center space-y-4">
            <p className="text-4xl">📍</p>
            <p className="font-medium text-gray-900">Find AYUSH doctors near you</p>
            <p className="text-sm text-gray-500">
              Share your location or enter your address/pincode — we never store it.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={locateByBrowser} className="btn-primary">
                Use my location
              </button>
              <button onClick={() => setShowAddressInput(true)}
                className="btn-secondary">
                Enter address / pincode
              </button>
            </div>
          </div>
        )}

        {/* Address input — shown proactively or after location denial */}
        {(showAddressInput || (status === 'error' && !coords)) && (
          <div className="card p-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🏠</span>
              <div>
                <p className="font-medium text-gray-900">Enter your location</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Pincode, area name, or city — e.g. "600017" or "T. Nagar, Chennai"
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                placeholder="e.g. 600034, Adyar Chennai, Ernakulam…"
                value={addressQuery}
                onChange={e => setAddressQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && locateByAddress()}
              />
              <button
                onClick={locateByAddress}
                disabled={!addressQuery.trim() || status === 'geocoding'}
                className="btn-primary px-5 disabled:opacity-50"
              >
                {status === 'geocoding' ? '…' : 'Search'}
              </button>
            </div>

            {geocodeError && (
              <p className="text-sm text-red-500">{geocodeError}</p>
            )}

            {!showAddressInput && (
              <p className="text-xs text-gray-400">
                Browser location was denied.{' '}
                <button onClick={locateByBrowser} className="text-brand-600 hover:underline">
                  Try again
                </button>
              </p>
            )}

            {showAddressInput && status !== 'error' && (
              <button onClick={locateByBrowser}
                className="text-xs text-brand-600 hover:underline">
                Or use my GPS location instead
              </button>
            )}
          </div>
        )}

        {status === 'locating' && (
          <div className="card p-8 text-center text-sm text-gray-400">Getting your location…</div>
        )}

        {status === 'geocoding' && (
          <div className="card p-8 text-center text-sm text-gray-400">
            Finding "{addressQuery}"…
          </div>
        )}

        {status === 'loading' && (
          <div className="card p-8 text-center text-sm text-gray-400">Searching nearby doctors…</div>
        )}

        {status === 'done' && doctors.length === 0 && (
          <div className="card p-8 text-center space-y-2">
            <p className="text-gray-400 text-sm">
              No doctors found within {radius} km
              {spec ? ` for ${SPEC_LABELS[spec]}` : ''}
              {langFilter ? ` who speak ${LANG_LABELS[langFilter] ?? langFilter}` : ''}.
            </p>
            <div className="flex flex-col items-center gap-2">
              {radius < 50 && (
                <button onClick={() => setRadius(r => Math.min(r * 2, 50))}
                  className="text-brand-600 text-sm font-medium hover:underline">
                  Expand to {Math.min(radius * 2, 50)} km
                </button>
              )}
              {langFilter && (
                <button onClick={() => setLangFilter('')}
                  className="text-brand-600 text-sm font-medium hover:underline">
                  Remove language filter
                </button>
              )}
              {spec && (
                <button onClick={() => setSpec('')}
                  className="text-brand-600 text-sm font-medium hover:underline">
                  Show all AYUSH specializations
                </button>
              )}
            </div>
          </div>
        )}

        {status === 'done' && doctors.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              {doctors.length} doctor{doctors.length !== 1 ? 's' : ''} found near {locationLabel}
              {langFilter ? ` · speaking ${LANG_LABELS[langFilter] ?? langFilter}` : ''}
            </p>

            {doctors.map(doc => (
              <div key={doc.id} className="card p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-brand-700 font-semibold text-sm">
                    {doc.first_name[0]}{doc.last_name[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900">Dr. {doc.first_name} {doc.last_name}</p>
                    {doc.teleconsult_enabled && (
                      <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                        📹 Teleconsult
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {SPEC_LABELS[doc.ayush_specialization] ?? doc.ayush_specialization}
                    {' · '}{doc.years_of_experience}y exp
                    {' · '}{doc.city}, {doc.state}
                  </p>
                  {doc.languages_spoken?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {doc.languages_spoken.map((code: string) => (
                        <span key={code}
                          className={`text-xs px-2 py-0.5 rounded-full border ${
                            code === langFilter
                              ? 'bg-brand-600 text-white border-brand-600'
                              : 'bg-gray-50 text-gray-500 border-gray-200'
                          }`}>
                          {LANGUAGES.find(l => l.code === code)?.nativeLabel ?? code}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {doc.distance_km?.toFixed(1)} km away
                    {doc.teleconsult_enabled && doc.teleconsult_fee > 0
                      ? ` · ₹${doc.teleconsult_fee} teleconsult` : ''}
                  </p>
                </div>
                <a href={`/doctors/${doc.id}`}
                  className="btn-primary text-xs px-3 py-1.5 flex-shrink-0">
                  View & Book
                </a>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
