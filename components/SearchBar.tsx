'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Result {
  name: string
  city: string
  lat: number
  lon: number
  usage: string
  floors: number
}

interface Props {
  onSelect: (result: { lat: number; lon: number; name: string }) => void
}

// Static known buildings (fallback while backend search is being built)
const KNOWN_BUILDINGS: Result[] = [
  { name: 'Times Tower',                        city: 'Nairobi', lat: -1.2879, lon: 36.8246, usage: 'Commercial', floors: 33 },
  { name: 'KICC Tower',                         city: 'Nairobi', lat: -1.2864, lon: 36.8172, usage: 'Civic',      floors: 28 },
  { name: 'Kenyatta International Conference Centre', city: 'Nairobi', lat: -1.2864, lon: 36.8172, usage: 'Civic', floors: 28 },
  { name: 'Teleposta Towers',                   city: 'Nairobi', lat: -1.2875, lon: 36.8192, usage: 'Commercial', floors: 27 },
  { name: 'Bunge Tower',                        city: 'Nairobi', lat: -1.2890, lon: 36.8137, usage: 'Civic',      floors: 26 },
  { name: 'Cooperative Bank House',             city: 'Nairobi', lat: -1.2860, lon: 36.8215, usage: 'Commercial', floors: 25 },
  { name: 'Treasury Building',                  city: 'Nairobi', lat: -1.2907, lon: 36.8184, usage: 'Civic',      floors: 15 },
  { name: 'Harambee House',                     city: 'Nairobi', lat: -1.2893, lon: 36.8183, usage: 'Civic',      floors: 13 },
  { name: 'Nation Media House',                 city: 'Nairobi', lat: -1.2848, lon: 36.8242, usage: 'Commercial', floors: 10 },
  { name: 'Jogoo House',                        city: 'Nairobi', lat: -1.2893, lon: 36.8245, usage: 'Civic',      floors: 11 },
  { name: 'Sheria House',                       city: 'Nairobi', lat: -1.2901, lon: 36.8193, usage: 'Civic',      floors: 9  },
]

export default function SearchBar({ onSelect }: Props) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = (q: string) => {
    if (!q.trim()) { setResults([]); return }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const lq = q.toLowerCase()
      const hits = KNOWN_BUILDINGS.filter(b =>
        b.name.toLowerCase().includes(lq) || b.city.toLowerCase().includes(lq)
      )
      setResults(hits.slice(0, 8))
      setOpen(hits.length > 0)
    }, 200)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    search(e.target.value)
  }

  const handleSelect = (r: Result) => {
    setQuery(r.name)
    setOpen(false)
    onSelect({ lat: r.lat, lon: r.lon, name: r.name })
  }

  const clear = () => { setQuery(''); setResults([]); setOpen(false) }

  const USAGE_DOT: Record<string, string> = {
    Residential: 'bg-sky-400',
    Commercial:  'bg-amber-400',
    Industrial:  'bg-purple-400',
    Civic:       'bg-emerald-400',
  }

  return (
    <div className="relative w-full max-w-xs">
      <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-white/10
                      bg-white/[0.06] focus-within:border-sky-500/50 focus-within:bg-white/[0.08]
                      transition-all">
        {loading
          ? <Loader2 size={13} className="shrink-0 text-zinc-500 animate-spin" />
          : <Search   size={13} className="shrink-0 text-zinc-500" />}
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search buildings…"
          className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 outline-none"
        />
        {query && (
          <button onClick={clear} className="text-zinc-600 hover:text-zinc-400">
            <X size={12} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-white/[0.08]
                        shadow-2xl overflow-hidden z-50"
             style={{ background: 'rgba(10,11,16,0.97)', backdropFilter: 'blur(16px)' }}>
          {results.map((r, i) => (
            <button key={i} onMouseDown={() => handleSelect(r)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left
                         hover:bg-white/[0.06] transition-colors border-b border-white/[0.04] last:border-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${USAGE_DOT[r.usage] ?? 'bg-zinc-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{r.name}</p>
                <p className="text-xs text-zinc-500">{r.city} · {r.floors} fl · {r.usage}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
