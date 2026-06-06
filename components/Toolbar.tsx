'use client'

import { Cpu, Database, Loader2, Layers3, Palette } from 'lucide-react'
import type { DataSource } from '@/lib/types'

interface Props {
  loading:       boolean
  buildingCount: number | null
  totalGFA:      number | null
  source:        DataSource
  radius:        number
  colourByUsage: boolean
  onSourceChange: (s: DataSource) => void
  onRadiusChange: (r: number) => void
  onColourToggle: () => void
}

export default function Toolbar({
  loading, buildingCount, totalGFA, source, radius,
  colourByUsage, onSourceChange, onRadiusChange, onColourToggle,
}: Props) {
  return (
    <header className="absolute top-0 inset-x-0 z-20 flex items-center gap-3 px-4 py-3
                        bg-[rgba(10,11,16,0.88)] backdrop-blur-md border-b border-white/[0.06]">

      {/* Brand */}
      <div className="flex items-center gap-2 mr-1">
        <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sm">
          🏙️
        </div>
        <span className="font-semibold text-sm tracking-tight hidden sm:block">
          <span className="text-sky-400">Kenya</span>
          <span className="text-white"> 3D Cadastre</span>
        </span>
      </div>

      <div className="w-px h-5 bg-white/10 hidden sm:block" />

      {/* Hint / stats */}
      <div className="flex-1 min-w-0">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Loader2 size={12} className="animate-spin text-sky-400" />
            Fetching buildings…
          </div>
        ) : buildingCount !== null ? (
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-white font-semibold">
              <Layers3 size={12} className="text-sky-400" />
              {buildingCount.toLocaleString()} buildings
            </span>
            {totalGFA !== null && (
              <span className="text-zinc-500 hidden sm:block">
                {(totalGFA / 1000).toFixed(0)} k m² GFA
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            Double-click the map to load buildings
          </p>
        )}
      </div>

      {/* Source toggle */}
      <div className="flex rounded-lg overflow-hidden border border-white/10 shrink-0">
        <button
          onClick={() => onSourceChange('osm')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
            source === 'osm'
              ? 'bg-sky-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <Database size={11} />
          OSM
        </button>
        <button
          onClick={() => onSourceChange('microsoft')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
            source === 'microsoft'
              ? 'bg-sky-600 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <Cpu size={11} />
          MS AI
        </button>
      </div>

      {/* Radius */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-zinc-500 w-14 text-right tabular-nums">{radius} m</span>
        <input
          type="range" min={200} max={1500} step={100} value={radius}
          onChange={e => onRadiusChange(Number(e.target.value))}
          className="w-20 accent-sky-500 cursor-pointer"
        />
      </div>

      <div className="w-px h-5 bg-white/10" />

      {/* Colour toggle */}
      <button
        onClick={onColourToggle}
        title={colourByUsage ? 'Switch to uniform grey' : 'Colour by usage'}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
          colourByUsage
            ? 'border-sky-500/50 bg-sky-500/10 text-sky-400'
            : 'border-white/10 text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
        }`}
      >
        <Palette size={12} />
        <span className="hidden sm:inline">{colourByUsage ? 'Usage' : 'Grey'}</span>
      </button>
    </header>
  )
}
