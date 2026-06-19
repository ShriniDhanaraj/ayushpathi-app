'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const DAYS = [
  { code: 'MON', label: 'Monday' }, { code: 'TUE', label: 'Tuesday' },
  { code: 'WED', label: 'Wednesday' }, { code: 'THU', label: 'Thursday' },
  { code: 'FRI', label: 'Friday' }, { code: 'SAT', label: 'Saturday' },
  { code: 'SUN', label: 'Sunday' },
]
const SLOT_DURATIONS = [10, 15, 20, 30, 45, 60]

interface DayAvailability {
  day_of_week: string
  active: boolean
  start_time: string
  end_time: string
  slot_duration: number
}

function defaultSchedule(): DayAvailability[] {
  return DAYS.map(d => ({ day_of_week: d.code, active: false, start_time: '09:00', end_time: '17:00', slot_duration: 20 }))
}

async function authFetch(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      ...(options.headers ?? {}),
    },
  })
}

export default function AvailabilityPage() {
  const [schedule, setSchedule] = useState<DayAvailability[]>(defaultSchedule())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    authFetch('/api/doctor/availability')
      .then(r => r.json())
      .then(json => {
        if (json.availability && json.availability.length > 0) {
          setSchedule(DAYS.map(d => {
            const found = json.availability.find((e: DayAvailability) => e.day_of_week === d.code)
            return found ?? { day_of_week: d.code, active: false, start_time: '09:00', end_time: '17:00', slot_duration: 20 }
          }))
        }
      })
      .catch(() => {})
  }, [])

  function toggle(code: string) {
    setSchedule(s => s.map(d => d.day_of_week === code ? { ...d, active: !d.active } : d))
  }
  function update(code: string, field: keyof DayAvailability, value: string | number | boolean) {
    setSchedule(s => s.map(d => d.day_of_week === code ? { ...d, [field]: value } : d))
  }

  async function save() {
    setSaving(true); setError(null)
    try {
      const res = await authFetch('/api/doctor/availability', {
        method: 'POST',
        body: JSON.stringify({ schedule }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <a href="/dashboard/doctor" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</a>
        <span className="font-semibold text-gray-900">Set Availability</span>
      </header>
      <main className="max-w-2xl mx-auto p-6 space-y-4">
        <p className="text-sm text-gray-500">
          Set which days you're available and your consultation hours. Patients can only book within these slots.
        </p>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</p>}
        <div className="space-y-3">
          {DAYS.map(day => {
            const d = schedule.find(s => s.day_of_week === day.code)!
            return (
              <div key={day.code} className={`bg-white rounded-xl border p-4 transition-opacity ${d.active ? '' : 'opacity-60'}`}>
                <div className="flex items-center gap-4 flex-wrap">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-green-600 cursor-pointer"
                    checked={d.active}
                    onChange={() => toggle(day.code)}
                  />
                  <span className="font-medium text-gray-900 w-24">{day.label}</span>
                  {d.active ? (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">From</label>
                        <input
                          type="time"
                          className="border rounded px-2 py-1 text-sm"
                          value={d.start_time}
                          onChange={e => update(day.code, 'start_time', e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">To</label>
                        <input
                          type="time"
                          className="border rounded px-2 py-1 text-sm"
                          value={d.end_time}
                          onChange={e => update(day.code, 'end_time', e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">Slot</label>
                        <select
                          className="border rounded px-2 py-1 text-sm"
                          value={d.slot_duration}
                          onChange={e => update(day.code, 'slot_duration', parseInt(e.target.value))}
                        >
                          {SLOT_DURATIONS.map(m => <option key={m} value={m}>{m} min</option>)}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Not available</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Availability'}
        </button>
      </main>
    </div>
  )
}
