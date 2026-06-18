'use client'
import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

const DAYS = [
  { code: 'MON', label: 'Monday' }, { code: 'TUE', label: 'Tuesday' },
  { code: 'WED', label: 'Wednesday' }, { code: 'THU', label: 'Thursday' },
  { code: 'FRI', label: 'Friday' }, { code: 'SAT', label: 'Saturday' },
  { code: 'SUN', label: 'Sunday' },
]

interface DayAvailability {
  day_of_week: string; active: boolean
  start_time: string; end_time: string; slot_duration: number
}

export default function AvailabilityPage() {
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [schedule, setSchedule] = useState<DayAvailability[]>(
    DAYS.map(d => ({ day_of_week: d.code, active: false, start_time: '09:00', end_time: '17:00', slot_duration: 20 }))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: doctor } = await supabase.from('doctor').select('id').eq('auth_user_id', user.id).single()
      if (!doctor) return
      setDoctorId(doctor.id)
      const { data: existing } = await supabase.from('doctor_availability').select('*').eq('doctor_id', doctor.id)
      if (existing && existing.length > 0) {
        setSchedule(DAYS.map(d => {
          const found = existing.find(e => e.day_of_week === d.code)
          return found
            ? { day_of_week: d.code, active: found.active, start_time: found.start_time, end_time: found.end_time, slot_duration: found.slot_duration }
            : { day_of_week: d.code, active: false, start_time: '09:00', end_time: '17:00', slot_duration: 20 }
        }))
      }
    }
    load()
  }, [])

  function toggle(code: string) {
    setSchedule(s => s.map(d => d.day_of_week === code ? { ...d, active: !d.active } : d))
  }
  function update(code: string, field: keyof DayAvailability, value: string | number | boolean) {
    setSchedule(s => s.map(d => d.day_of_week === code ? { ...d, [field]: value } : d))
  }

  async function save() {
    if (!doctorId) return
    setSaving(true)
    const supabase = getSupabaseClient()
    // Upsert all days
    const rows = schedule.map(d => ({ doctor_id: doctorId, ...d }))
    await supabase.from('doctor_availability').upsert(rows, { onConflict: 'doctor_id,day_of_week' })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <a href="/dashboard/doctor" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</a>
        <span className="font-semibold text-gray-900">Set Availability</span>
      </header>
      <main className="max-w-2xl mx-auto p-6 space-y-4">
        <p className="text-sm text-gray-500">Set which days you're available and your consultation hours. Patients can only book within these slots.</p>
        <div className="space-y-3">
          {DAYS.map(day => {
            const d = schedule.find(s => s.day_of_week === day.code)!
            return (
              <div key={day.code} className={`card p-4 transition-all ${d.active ? '' : 'opacity-60'}`}>
                <div className="flex items-center gap-4">
                  <input type="checkbox" className="w-5 h-5 accent-brand-600 cursor-pointer"
                    checked={d.active} onChange={() => toggle(day.code)} />
                  <span className="font-medium text-gray-900 w-24">{day.label}</span>
                  {d.active && (
                    <div className="flex items-center gap-3 flex-1">
                      <input type="time" className="input w-28" value={d.start_time}
                        onChange={e => update(day.code, 'start_time', e.target.value)} />
                      <span className="text-gray-400 text-sm">to</span>
                      <input type="time" className="input w-28" value={d.end_time}
                        onChange={e => update(day.code, 'end_time', e.target.value)} />
                      <select className="input w-28" value={d.slot_duration}
                        onChange={e => update(day.code, 'slot_duration', parseInt(e.target.value))}>
                        {[10, 15, 20, 30, 45, 60].map(m => <option key={m} value={m}>{m} min</option>)}
                      </select>
                    </div>
                  )}
                  {!d.active && <span className="text-sm text-gray-400">Not available</span>}
                </div>
              </div>
            )
          })}
        </div>
        <button onClick={save} disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Availability'}
        </button>
      </main>
    </div>
  )
}
