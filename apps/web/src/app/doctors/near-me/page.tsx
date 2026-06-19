'use client'
import { useState, useEffect } from 'react'
import { LANGUAGES } from '@ayushpathi/shared/constants/languages'

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

// Build language label lookup from shared constants
const LANG_LABELS: Record<string, string> = Object.fromEntries(
  LANGUAGES.map(l => [l.code, `${l.nativeLabel} (${l.label})`])
)

export default function NearMePage() {
  const [doctors, setDoctors] = useState<NearbyDoctor[]>([])
  const [spec, setSpec] = useState('')
  const [radius, setRadius] = useState(10)
  // Language filter — empty string = no filter
  const [langFilter, setLangFilter] = useState('')
  const [status, setStatus] = useState<'idle' | 'locating' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  // Pre-fill language filter from session (set on login from patient profile)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLang = sessionStorage.getItem('ayushpathi_ui_lang')
      if (storedLang && storedLang !== 'EN') setLangFilter(storedLang)
    }
  }, [])

  function locate() {
    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatus('idle')
      },
      () => { setErrorMsg('Location access denied. Please enable location in browser settings.'); setStatus('error') }
    )
  }

  async function search() {
    if (!coords) { locate(); return }
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

  useEffect(() => { if (coords) search() }, [coords, spec, radius, langFilter])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <a href="/appointments/new" className="text-gray-400 hover:text-gray-600 text-sm">← Back</a>
        <span className="font-semibold text-gray-900">Doctors Near Me</span>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-5">
        {/* Filters */}
        <div className="card p-4 space-y-3">
          {/* Specialization row */}
          <div className="flex gap-2 flex-wrap">
            {SPEC.map(s => (
              <button key={s.code} onClick={() => setSpec(s.code)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  spec === s.code ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-brand-400'
                }`}>{s.label}</button>
            ))}
          </div>

          {/* Language + Radius row */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Language filter */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <span className="text-xs text-gray-500 whitespace-nowrap">Speaks</span>
              <select
                className="input text-sm flex-1"
                value={langFilter}
                onChange={e => setLangFilter(e.target.value)}
              >
                <option value="">Any language</option>
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>
                    {l.nativeLabel} ({l.label})
                  </option>
                ))}
              </select>
            </div>

            {/* Radius */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Within</span>
              <select className="input w-24" value={radius} onChange={e => setRadius(parseInt(e.target.value))}>
                {[5, 10, 20, 50].map(r => <option key={r} value={r}>{r} km</option>)}
              </select>
            </div>
          </div>

          {/* Active language filter badge */}
          {langFilter && (
            <div className="flex items-center gap-2 text-xs text-brand-700 bg-brand-50 rounded-full px-3 py-1 w-fit">
              <span>🗣️ Filtered: {LANG_LABELS[langFilter] ?? langFilter}</span>
              <button onClick={() => setLangFilter('')} className="text-brand-400 hover:text-brand-600 font-bold">✕</button>
            </div>
          )}
        </div>

        {/* Location prompt */}
        {status === 'idle' && !coords && (
          <div className="card p-8 text-center space-y-3">
            <p className="text-4xl">📍</p>
            <p className="font-medium text-gray-900">Find AYUSH doctors near you</p>
            <p className="text-sm text-gray-500">We use your location to show doctors closest to you. Location is never stored.</p>
            <button onClick={locate} className="btn-primary mx-auto">Share my location</button>
          </div>
        )}

        {status === 'locating' && (
          <div className="card p-8 text-center text-sm text-gray-400">Getting your location…</div>
        )}

        {status === 'loading' && (
          <div className="card p-8 text-center text-sm text-gray-400">Searching nearby doctors…</div>
        )}

        {status === 'error' && (
          <div className="card p-6 text-center">
            <p className="text-red-600 text-sm">{errorMsg}</p>
          </div>
        )}

        {status === 'done' && doctors.length === 0 && (
          <div className="card p-8 text-center space-y-2">
            <p className="text-gray-400 text-sm">
              No doctors found within {radius} km
              {spec ? ` for ${SPEC_LABELS[spec]}` : ''}
              {langFilter ? ` who speak ${LANG_LABELS[langFilter] ?? langFilter}` : ''}.
            </p>
            {langFilter && (
              <button
                onClick={() => setLangFilter('')}
                className="text-brand-600 text-sm font-medium hover:underline">
                Remove language filter and search again
              </button>
            )}
          </div>
        )}

        {status === 'done' && doctors.length > 0 && (
          <div className="space-y-3">
            {/* Result count */}
            <p className="text-xs text-gray-400">
              {doctors.length} doctor{doctors.length !== 1 ? 's' : ''} found
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
                    <p className="font-medium text-gray-900">
                      Dr. {doc.first_name} {doc.last_name}
                    </p>
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
                  {/* Language chips */}
                  {doc.languages_spoken?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {doc.languages_spoken.map((code: string) => (
                        <span
                          key={code}
                          className={`text-xs px-2 py-0.5 rounded-full border ${
                            code === langFilter
                              ? 'bg-brand-600 text-white border-brand-600'
                              : 'bg-gray-50 text-gray-500 border-gray-200'
                          }`}
                        >
                          {LANGUAGES.find(l => l.code === code)?.nativeLabel ?? code}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {doc.distance_km?.toFixed(1)} km away
                    {doc.teleconsult_enabled && doc.teleconsult_fee
                      ? ` · ₹${doc.teleconsult_fee} teleconsult`
                      : ''}
                  </p>
                </div>
                <a
                  href={`/appointments/new?doctor=${doc.id}`}
                  className="btn-primary text-xs px-3 py-1.5 flex-shrink-0"
                >
                  Book
                </a>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
