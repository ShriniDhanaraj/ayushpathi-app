'use client'
import { useState, useRef, useEffect } from 'react'
import { suggestAddresses, type AddressSuggestion } from '@/lib/maps'

interface Props {
  onSelect: (s: AddressSuggestion) => void
  placeholder?: string
}

export default function AddressAutocomplete({ onSelect, placeholder = 'Start typing your area or pincode…' }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AddressSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef<NodeJS.Timeout>()

  useEffect(() => {
    clearTimeout(timer.current)
    if (query.length < 3) { setResults([]); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      const r = await suggestAddresses(query)
      setResults(r); setOpen(r.length > 0)
      setLoading(false)
    }, 350)        // 350ms debounce — avoids hammering the API
  }, [query])

  function pick(s: AddressSuggestion) {
    setQuery(s.placeName); setOpen(false); onSelect(s)
  }

  return (
    <div className="relative">
      <input
        className="input"
        placeholder={placeholder}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {loading && (
        <span className="absolute right-3 top-3 text-xs text-gray-400">Searching…</span>
      )}
      {open && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {results.map(s => (
            <li key={s.placeId}
              className="px-4 py-3 hover:bg-brand-50 cursor-pointer border-b border-gray-100 last:border-0"
              onMouseDown={() => pick(s)}>
              <p className="text-sm font-medium text-gray-900">{s.placeName}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {[s.city, s.district, s.state, s.pincode].filter(Boolean).join(', ')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
