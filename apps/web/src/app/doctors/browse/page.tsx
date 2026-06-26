'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

interface Doctor {
  id: string
  first_name: string
  last_name: string
  ayush_specialization: string
  years_of_experience: number | null
  languages_spoken: string[] | null
  profile_photo_url: string | null
  address: { city: string | null; state: string | null } | null
}

const SPEC_LABELS: Record<string, string> = {
  AYU: 'Ayurveda', YOG: 'Yoga & Naturopathy',
  UNA: 'Unani', SID: 'Siddha', HOM: 'Homeopathy',
}
const SPEC_COLORS: Record<string, string> = {
  AYU: 'bg-green-100 text-green-700',
  YOG: 'bg-blue-100 text-blue-700',
  UNA: 'bg-purple-100 text-purple-700',
  SID: 'bg-orange-100 text-orange-700',
  HOM: 'bg-pink-100 text-pink-700',
}
const LANG_LABELS: Record<string, string> = {
  EN: 'English', TA: 'Tamil', HI: 'Hindi', TE: 'Telugu',
  KN: 'Kannada', ML: 'Malayalam', BN: 'Bengali', GU: 'Gujarati',
  MR: 'Marathi', PA: 'Punjabi', OR: 'Odia', AS: 'Assamese',
  UR: 'Urdu', SA: 'Sanskrit',
}

function BrowseContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [spec, setSpec] = useState(searchParams.get('specialization') ?? '')
  const [lang, setLang] = useState(searchParams.get('language') ?? '')
  const [city, setCity] = useState(searchParams.get('city') ?? '')

  const fetchDoctors = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (spec)   params.set('specialization', spec)
    if (lang)   params.set('language', lang)
    if (city)   params.set('city', city)
    try {
      const res = await fetch(`/api/doctors?${params}`)
      const json = await res.json()
      setDoctors(json.doctors ?? [])
    } catch {}
    setLoading(false)
  }, [search, spec, lang, city])

  useEffect(() => { fetchDoctors() }, [fetchDoctors])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    fetchDoctors()
  }

  function clearFilters() {
    setSearch(''); setSpec(''); setLang(''); setCity('')
  }

  const hasFilters = !!(search || spec || lang || city)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 sm:px-6 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
        <div>
          <h1 className="font-bold text-gray-900 text-base sm:text-lg">Find AYUSH Doctors</h1>
          <p className="text-xs text-gray-500">Browse verified practitioners</p>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b px-4 sm:px-6 py-4">
        <form onSubmit={handleSearch} className="max-w-4xl mx-auto space-y-3">
          {/* Search */}
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search doctor name…"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button type="submit" className="btn-primary px-4 py-2 text-sm">Search</button>
          </div>
          {/* Filter row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select value={spec} onChange={e => setSpec(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Specializations</option>
              {Object.entries(SPEC_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select value={lang} onChange={e => setLang(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Languages</option>
              {Object.entries(LANG_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="City or State…"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {hasFilters && (
              <button type="button" onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg px-3 py-2"
              >
                Clear filters
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Results */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Near me shortcut */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {loading ? 'Searching…' : `${doctors.length} doctor${doctors.length !== 1 ? 's' : ''} found`}
          </p>
          <a
            href="/doctors/near-me"
            className="flex items-center gap-1.5 text-xs text-brand-600 hover:underline font-medium"
          >
            📍 Show doctors near me
          </a>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="card p-5 animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-gray-400 text-sm">No doctors match your filters.</p>
            {hasFilters && (
              <button onClick={clearFilters} className="text-brand-600 text-sm font-medium mt-2 hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {doctors.map(doc => {
              const addr = Array.isArray(doc.address) ? doc.address[0] : doc.address
              const location = [addr?.city, addr?.state].filter(Boolean).join(', ')
              return (
                <div key={doc.id} className="card p-4 sm:p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center overflow-hidden">
                      {doc.profile_photo_url ? (
                        <img src={doc.profile_photo_url} alt="photo" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">👨‍⚕️</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">
                        Dr. {doc.first_name} {doc.last_name}
                      </p>
                      <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${SPEC_COLORS[doc.ayush_specialization] ?? 'bg-gray-100 text-gray-600'}`}>
                        {SPEC_LABELS[doc.ayush_specialization] ?? doc.ayush_specialization}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {doc.years_of_experience && (
                      <p className="text-xs text-gray-500">
                        🎓 {doc.years_of_experience} year{doc.years_of_experience !== 1 ? 's' : ''} experience
                      </p>
                    )}
                    {location && (
                      <p className="text-xs text-gray-500">📍 {location}</p>
                    )}
                    {doc.languages_spoken && doc.languages_spoken.length > 0 && (
                      <p className="text-xs text-gray-500">
                        🗣 {doc.languages_spoken.map(l => LANG_LABELS[l] ?? l).join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <a
                      href={`/doctors/${doc.id}`}
                      className="flex-1 text-center text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 py-1.5 rounded-lg transition-colors"
                    >
                      View Profile
                    </a>
                    <a
                      href={`/appointments/new?doctor=${doc.id}`}
                      className="flex-1 text-center text-xs btn-primary py-1.5"
                    >
                      Book
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default function DoctorsBrowsePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading…</div>}>
      <BrowseContent />
    </Suspense>
  )
}
