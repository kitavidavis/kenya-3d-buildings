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

// All 47 counties as searchable locations
const KENYA_COUNTIES: Result[] = [
  // Nairobi
  { name: 'Nairobi',          city: 'Nairobi County',      lat: -1.2884, lon: 36.8218, usage: 'Civic', floors: 0 },
  // Central
  { name: 'Kiambu',           city: 'Kiambu County',       lat: -1.0314, lon: 36.8356, usage: 'Civic', floors: 0 },
  { name: "Murang'a",         city: "Murang'a County",     lat: -0.7243, lon: 37.1529, usage: 'Civic', floors: 0 },
  { name: 'Kirinyaga',        city: 'Kirinyaga County',    lat: -0.4990, lon: 37.2807, usage: 'Civic', floors: 0 },
  { name: 'Nyeri',            city: 'Nyeri County',        lat: -0.4167, lon: 36.9500, usage: 'Civic', floors: 0 },
  { name: 'Nyandarua',        city: 'Nyandarua County',    lat: -0.2716, lon: 36.3766, usage: 'Civic', floors: 0 },
  // Eastern
  { name: 'Machakos',         city: 'Machakos County',     lat: -1.5218, lon: 37.2695, usage: 'Civic', floors: 0 },
  { name: 'Makueni',          city: 'Makueni County',      lat: -1.7835, lon: 37.6344, usage: 'Civic', floors: 0 },
  { name: 'Kitui',            city: 'Kitui County',        lat: -1.3666, lon: 38.0099, usage: 'Civic', floors: 0 },
  { name: 'Embu',             city: 'Embu County',         lat: -0.5309, lon: 37.4581, usage: 'Civic', floors: 0 },
  { name: 'Tharaka-Nithi',    city: 'Tharaka-Nithi County',lat: -0.3381, lon: 37.6524, usage: 'Civic', floors: 0 },
  { name: 'Meru',             city: 'Meru County',         lat:  0.0473, lon: 37.6494, usage: 'Civic', floors: 0 },
  { name: 'Isiolo',           city: 'Isiolo County',       lat:  0.3541, lon: 37.5822, usage: 'Civic', floors: 0 },
  { name: 'Marsabit',         city: 'Marsabit County',     lat:  2.3342, lon: 37.9947, usage: 'Civic', floors: 0 },
  // Rift Valley
  { name: 'Kajiado',          city: 'Kajiado County',      lat: -1.8511, lon: 36.7763, usage: 'Civic', floors: 0 },
  { name: 'Narok',            city: 'Narok County',        lat: -1.0830, lon: 35.8699, usage: 'Civic', floors: 0 },
  { name: 'Nakuru',           city: 'Nakuru County',       lat: -0.3031, lon: 36.0800, usage: 'Civic', floors: 0 },
  { name: 'Laikipia',         city: 'Laikipia County',     lat:  0.0172, lon: 37.0744, usage: 'Civic', floors: 0 },
  { name: 'Baringo',          city: 'Baringo County',      lat:  0.4926, lon: 35.7432, usage: 'Civic', floors: 0 },
  { name: 'Elgeyo-Marakwet',  city: 'Elgeyo-Marakwet County', lat: 0.6699, lon: 35.5110, usage: 'Civic', floors: 0 },
  { name: 'Nandi',            city: 'Nandi County',        lat:  0.2023, lon: 35.0985, usage: 'Civic', floors: 0 },
  { name: 'Uasin Gishu',      city: 'Uasin Gishu County', lat:  0.5143, lon: 35.2698, usage: 'Civic', floors: 0 },
  { name: 'Trans-Nzoia',      city: 'Trans-Nzoia County',  lat:  1.0174, lon: 35.0062, usage: 'Civic', floors: 0 },
  { name: 'Kericho',          city: 'Kericho County',      lat: -0.3697, lon: 35.2836, usage: 'Civic', floors: 0 },
  { name: 'Bomet',            city: 'Bomet County',        lat: -0.7863, lon: 35.3423, usage: 'Civic', floors: 0 },
  { name: 'Samburu',          city: 'Samburu County',      lat:  1.0981, lon: 36.6996, usage: 'Civic', floors: 0 },
  { name: 'West Pokot',       city: 'West Pokot County',   lat:  1.2378, lon: 35.1133, usage: 'Civic', floors: 0 },
  { name: 'Turkana',          city: 'Turkana County',      lat:  3.1191, lon: 35.5970, usage: 'Civic', floors: 0 },
  // Western
  { name: 'Bungoma',          city: 'Bungoma County',      lat:  0.5636, lon: 34.5607, usage: 'Civic', floors: 0 },
  { name: 'Busia',            city: 'Busia County',        lat:  0.4612, lon: 34.1113, usage: 'Civic', floors: 0 },
  { name: 'Kakamega',         city: 'Kakamega County',     lat:  0.2831, lon: 34.7523, usage: 'Civic', floors: 0 },
  { name: 'Vihiga',           city: 'Vihiga County',       lat:  0.0768, lon: 34.7219, usage: 'Civic', floors: 0 },
  // Nyanza
  { name: 'Kisumu',           city: 'Kisumu County',       lat: -0.1022, lon: 34.7617, usage: 'Civic', floors: 0 },
  { name: 'Siaya',            city: 'Siaya County',        lat: -0.0612, lon: 34.2878, usage: 'Civic', floors: 0 },
  { name: 'Homa Bay',         city: 'Homa Bay County',     lat: -0.5273, lon: 34.4570, usage: 'Civic', floors: 0 },
  { name: 'Migori',           city: 'Migori County',       lat: -1.0634, lon: 34.4731, usage: 'Civic', floors: 0 },
  { name: 'Kisii',            city: 'Kisii County',        lat: -0.6816, lon: 34.7667, usage: 'Civic', floors: 0 },
  { name: 'Nyamira',          city: 'Nyamira County',      lat: -0.5632, lon: 34.9352, usage: 'Civic', floors: 0 },
  // Coast
  { name: 'Mombasa',          city: 'Mombasa County',      lat: -4.0435, lon: 39.6682, usage: 'Civic', floors: 0 },
  { name: 'Kwale',            city: 'Kwale County',        lat: -4.1735, lon: 39.4522, usage: 'Civic', floors: 0 },
  { name: 'Kilifi',           city: 'Kilifi County',       lat: -3.6305, lon: 39.8499, usage: 'Civic', floors: 0 },
  { name: 'Malindi',          city: 'Kilifi County',       lat: -3.2138, lon: 40.1169, usage: 'Civic', floors: 0 },
  { name: 'Taita-Taveta',     city: 'Taita-Taveta County', lat: -3.3960, lon: 38.5566, usage: 'Civic', floors: 0 },
  { name: 'Tana River',       city: 'Tana River County',   lat: -1.4987, lon: 40.0311, usage: 'Civic', floors: 0 },
  { name: 'Lamu',             city: 'Lamu County',         lat: -2.2696, lon: 40.9023, usage: 'Civic', floors: 0 },
  // North Eastern
  { name: 'Garissa',          city: 'Garissa County',      lat: -0.4531, lon: 39.6460, usage: 'Civic', floors: 0 },
  { name: 'Wajir',            city: 'Wajir County',        lat:  1.7471, lon: 40.0573, usage: 'Civic', floors: 0 },
  { name: 'Mandera',          city: 'Mandera County',      lat:  3.9373, lon: 41.8569, usage: 'Civic', floors: 0 },
]

// Landmark buildings (Nairobi)
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

// Combined search index: counties first, then landmark buildings
const ALL_RESULTS = [...KENYA_COUNTIES, ...KNOWN_BUILDINGS]

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
      const hits = ALL_RESULTS.filter(b =>
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
                <p className="text-xs text-zinc-500">
                  {r.city}{r.floors > 0 ? ` · ${r.floors} fl · ${r.usage}` : ' · County headquarters'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
