'use client'

import { Palette, Layers3, Globe2 } from 'lucide-react'
import SearchBar from './SearchBar'
import FilterPanel, { type FilterState } from './FilterPanel'

interface Props {
  visibleCount:  number | null
  colourByUsage: boolean
  filter:        FilterState
  onFilterChange:(f: FilterState) => void
  onColourToggle:() => void
  onSearch:      (target: { lat: number; lon: number; name: string }) => void
}

export default function Toolbar({
  visibleCount, colourByUsage, filter, onFilterChange, onColourToggle, onSearch,
}: Props) {
  return (
    <header className="absolute top-0 inset-x-0 z-20 flex items-center gap-2.5 px-4 h-14
                        border-b border-white/[0.06]"
            style={{ background: 'rgba(9,10,15,0.90)', backdropFilter: 'blur(16px)' }}>

      {/* Brand */}
      <div className="flex items-center gap-2.5 shrink-0 mr-1">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center
                        bg-gradient-to-br from-sky-500/30 to-blue-600/20
                        border border-sky-500/20 text-sm select-none">
          🏙️
        </div>
        <div className="hidden sm:block">
          <p className="text-xs font-bold tracking-tight leading-none">
            <span className="text-sky-400">Kenya</span>
            <span className="text-white"> 3D Cadastre</span>
          </p>
          <p className="text-[10px] text-zinc-600 leading-none mt-0.5">
            National Building Registry
          </p>
        </div>
      </div>

      <div className="w-px h-5 bg-white/10 hidden sm:block" />

      {/* Search */}
      <div className="flex-1 max-w-xs">
        <SearchBar onSelect={onSearch} />
      </div>

      {/* Stats */}
      {visibleCount !== null && (
        <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-500">
          <Layers3 size={12} className="text-sky-500" />
          <span className="tabular-nums">
            <span className="text-white font-semibold">{visibleCount.toLocaleString()}</span>
            {' '}visible
          </span>
        </div>
      )}

      <div className="flex-1 sm:flex-none" />

      {/* Filter */}
      <FilterPanel value={filter} onChange={onFilterChange} />

      {/* Colour toggle */}
      <button
        onClick={onColourToggle}
        title={colourByUsage ? 'Uniform grey (TU Delft style)' : 'Colour by usage type'}
        className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium transition-all ${
          colourByUsage
            ? 'border-sky-500/50 bg-sky-500/10 text-sky-400'
            : 'border-white/10 bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.07]'
        }`}
      >
        <Palette size={13} />
        <span className="hidden sm:inline">{colourByUsage ? 'By usage' : 'Grey'}</span>
      </button>
    </header>
  )
}
