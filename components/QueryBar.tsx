'use client'

import { useState } from 'react'
import { Search, Loader2, Download, Database, Cpu } from 'lucide-react'
import type { DataSource, QueryParams } from '@/lib/types'

const CITIES = [
  { label: 'Nairobi',  lat: -1.2884, lon: 36.8218 },
  { label: 'Mombasa',  lat: -4.0435, lon: 39.6682 },
  { label: 'Kisumu',   lat: -0.1022, lon: 34.7617 },
  { label: 'Nakuru',   lat: -0.3031, lon: 36.0800 },
  { label: 'Eldoret',  lat:  0.5143, lon: 35.2698 },
  { label: 'Thika',    lat: -1.0332, lon: 37.0693 },
  { label: 'Nyeri',    lat: -0.4167, lon: 36.9500 },
  { label: 'Malindi',  lat: -3.2138, lon: 40.1169 },
]

interface Props {
  loading: boolean
  buildingCount: number | null
  params: QueryParams
  onQuery: (p: QueryParams) => void
  onDownloadGLB: () => void
}

export default function QueryBar({ loading, buildingCount, params, onQuery, onDownloadGLB }: Props) {
  const [city, setCity]   = useState('Nairobi')
  const [radius, setRadius] = useState(600)
  const [source, setSource] = useState<DataSource>('osm')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const c = CITIES.find(x => x.label === city) ?? CITIES[0]
    onQuery({ lat: c.lat, lon: c.lon, radius, source })
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-4">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 bg-zinc-900/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl p-2"
      >
        {/* City selector */}
        <select
          value={city}
          onChange={e => setCity(e.target.value)}
          className="flex-1 bg-transparent text-sm text-white outline-none px-2 py-1.5 cursor-pointer"
        >
          {CITIES.map(c => (
            <option key={c.label} value={c.label} className="bg-zinc-900">{c.label}</option>
          ))}
        </select>

        <div className="w-px h-6 bg-white/10" />

        {/* Radius */}
        <div className="flex items-center gap-2 px-2">
          <span className="text-xs text-zinc-400 whitespace-nowrap">{radius} m</span>
          <input
            type="range" min={200} max={1500} step={100}
            value={radius}
            onChange={e => setRadius(Number(e.target.value))}
            className="w-24 accent-sky-500"
          />
        </div>

        <div className="w-px h-6 bg-white/10" />

        {/* Source toggle */}
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          <button
            type="button"
            onClick={() => setSource('osm')}
            title="OpenStreetMap — fast, good coverage"
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${
              source === 'osm' ? 'bg-sky-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Database size={12} /> OSM
          </button>
          <button
            type="button"
            onClick={() => setSource('microsoft')}
            title="Microsoft AI — accurate building shapes"
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${
              source === 'microsoft' ? 'bg-sky-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Cpu size={12} /> Microsoft AI
          </button>
        </div>

        {/* Search button */}
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading
            ? <Loader2 size={14} className="animate-spin" />
            : <Search size={14} />}
          {loading ? 'Loading…' : 'Search'}
        </button>
      </form>

      {/* Results bar */}
      {buildingCount !== null && !loading && (
        <div className="flex items-center justify-between mt-2 px-3 py-1.5 bg-zinc-900/80 backdrop-blur-sm border border-white/10 rounded-lg text-xs text-zinc-400">
          <span>
            <span className="text-white font-semibold">{buildingCount.toLocaleString()}</span> buildings
            &nbsp;·&nbsp;
            {source === 'microsoft' ? 'Microsoft AI footprints' : 'OpenStreetMap'} &nbsp;·&nbsp; {radius} m radius
          </span>
          <button
            onClick={onDownloadGLB}
            className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors"
          >
            <Download size={11} /> Download .glb
          </button>
        </div>
      )}
    </div>
  )
}
