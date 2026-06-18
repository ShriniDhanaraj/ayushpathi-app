'use client'
import { useState, useEffect } from 'react'

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

export default function NearMePage() {
  const [doctors, setDoctors] = useState<NearbyDoctor[]>([])
  const [spec, setSpec] = useState('')
  const [radius, setRadius] = useState(10)
  const [status, setStatus] = useState<'idle' | 'locating' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

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
      radius: String(radius), ...(spec ? { specialization: spec } : {}),
    })
    const res = await fetch(`/api/doctors/near-me?${params}`)
    const data = await res.json()
    setDoctors(data.doctors ?? [])
    setStatus('done')
  }

  useEffect(() => { if (coords) search() }, [coords, spec, radius])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <a href="/appointments/new" className="text-gray-400 hover:text-gray-600 text-sm">← Back</a>
        <span className="font-semibold text-gray-900">Doctors Near Me</span>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-5">
        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <div className="flex gap-2 flex-wrap">
            {SPEC.map(s => (
              <button key={s.code} onClick={() => setSpec(s.code)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  spec === s.code ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-brand-400'
                }`}>{s.label}</button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-500">Within</span>
            <select className="input w-24" value={radius} onChange={e => setRadius(parseInt(e.target.value))}>
              {[5, 10, 20, 50].map(r => <option key={r} value={r}>{r} km</option>)}
            </select>
          </div>
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
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{errorMsg}</div>
        )}

        {/* Results */}
        {status === 'done' && doctors.length === 0 && (
          <div className="card p-8 text-center text-sm text-gray-400">
            No {spec ? SPEC_LABELS[spec] : 'AYUSH'} doctors found within {radius} km. Try increasing the radius.
          </div>
        )}

        {doctors.map(doc => (
          <div key={doc.id} className="card p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-900">Dr. {doc.first_name} {doc.last_name}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {SPEC_LABELS[doc.ayush_specialization]} · {doc.years_of_experience}yr exp
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {doc.city}, {doc.state} · {(doc.languages_spoken ?? []).join(', ')}
                </p>
              </div>
              <div className="text-right space-y-1.5">
                <div className="flex items-center justify-end gap-1 text-brand-700">
                  <span className="text-lg">📍</span>
                  <span className="font-semibold">{doc.distance_km} km</span>
                </div>
                {doc.teleconsult_enabled && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full block text-center">
                    💻 Teleconsult{doc.teleconsult_fee > 0 ? ` ₹${doc.teleconsult_fee}` : ' free'}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4">
              <a href={`/appointments/new?doctor=${doc.id}`} className="btn-primary text-sm w-full text-center block">
                Book Appointment
              </a>
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
