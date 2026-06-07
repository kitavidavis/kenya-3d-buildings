'use client'

import { Layers3, Boxes, Palette, Box } from 'lucide-react'
import SearchBar from './SearchBar'
import FilterPanel, { type FilterState } from './FilterPanel'

export type ColourMode = 'height' | 'usage' | 'flat'

interface Props {
  visibleCount:  number | null
  zoom:          number
  colourMode:    ColourMode
  pitch:         number
  filter:        FilterState
  onFilterChange:(f: FilterState) => void
  onColourMode:  (m: ColourMode) => void
  onPitchToggle: () => void
  onSearch:      (target: { lat: number; lon: number; name: string }) => void
}

const COLOUR_MODES: { key: ColourMode; label: string; title: string }[] = [
  { key: 'height', label: 'Height', title: 'Colour by height — tall buildings darker' },
  { key: 'usage',  label: 'Usage',  title: 'Colour by building usage type'            },
  { key: 'flat',   label: 'Grey',   title: 'Uniform grey — TU Delft style'            },
]

export default function Toolbar({
  visibleCount, zoom, colourMode, pitch,
  filter, onFilterChange, onColourMode, onPitchToggle, onSearch,
}: Props) {
  const is3D = pitch > 5

  return (
    <header className="absolute top-0 inset-x-0 z-20 flex items-center gap-2 px-4 h-14
                        border-b border-white/[0.06]"
            style={{ background: 'rgba(9,10,15,0.92)', backdropFilter: 'blur(18px)' }}>

      {/* Brand */}
      <div className="flex items-center gap-2.5 shrink-0 mr-1">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center
                        bg-gradient-to-br from-sky-500/25 to-blue-700/20
                        border border-sky-500/20 text-sm select-none">
          🏙️
        </div>
        <div className="hidden sm:block">
          <p className="text-xs font-bold tracking-tight leading-none">
            <span className="text-sky-400">Kenya</span>
            <span className="text-white"> 3D Buildings</span>
          </p>
          <p className="text-[10px] text-zinc-600 leading-none mt-0.5">
            National Building Registry
          </p>
        </div>
      </div>

      <div className="w-px h-5 bg-white/10 hidden sm:block shrink-0" />

      {/* Search */}
      <div className="flex-1 max-w-xs">
        <SearchBar onSelect={onSearch} />
      </div>

      {/* Stats */}
      <div className="hidden md:flex items-center gap-1.5 shrink-0">
        {zoom >= 13 && visibleCount !== null ? (
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Layers3 size={12} className="text-sky-500 shrink-0" />
            <span className="tabular-nums">
              <span className="text-white font-semibold">{visibleCount.toLocaleString()}</span>
              {' '}visible
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-zinc-600">
            <Layers3 size={12} className="shrink-0" />
            Zoom ≥ 13 to see buildings
          </span>
        )}
      </div>

      <div className="flex-1 sm:flex-none" />

      {/* Colour mode picker */}
      <div className="hidden sm:flex items-center rounded-lg overflow-hidden border border-white/10
                      divide-x divide-white/10 shrink-0">
        {COLOUR_MODES.map(({ key, label, title }) => (
          <button
            key={key}
            title={title}
            onClick={() => onColourMode(key)}
            className={`flex items-center gap-1.5 h-8 px-2.5 text-[11px] font-medium transition-all ${
              colourMode === key
                ? 'bg-sky-500/20 text-sky-300'
                : 'bg-white/[0.03] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]'
            }`}
          >
            <Palette size={11} />
            {label}
          </button>
        ))}
      </div>

      {/* Filter */}
      <FilterPanel value={filter} onChange={onFilterChange} />

      {/* 2D / 3D toggle */}
      <button
        onClick={onPitchToggle}
        title={is3D ? 'Switch to flat 2D view' : 'Switch to 3D view'}
        className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium
                    transition-all shrink-0 ${
          is3D
            ? 'border-sky-500/50 bg-sky-500/10 text-sky-400'
            : 'border-white/10 bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.07]'
        }`}
      >
        {is3D ? <Boxes size={13} /> : <Box size={13} />}
        <span className="hidden sm:inline">{is3D ? '3D' : '2D'}</span>
      </button>
    </header>
  )
}
