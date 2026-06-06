'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback } from 'react'
import Toolbar       from '@/components/Toolbar'
import BuildingPanel from '@/components/BuildingPanel'
import type { BuildingProperties } from '@/lib/types'
import type { FilterState } from '@/components/FilterPanel'

const CadastreMap = dynamic(() => import('@/components/CadastreMap'), { ssr: false })

const DEFAULT_FILTER: FilterState = { usage: null, minFloors: 1, maxFloors: 50 }

export default function Page() {
  const [selected,      setSelected]      = useState<BuildingProperties | null>(null)
  const [colourByUsage, setColourByUsage] = useState(false)
  const [filter,        setFilter]        = useState<FilterState>(DEFAULT_FILTER)
  const [visibleCount,  setVisibleCount]  = useState<number | null>(null)
  const [searchTarget,  setSearchTarget]  = useState<{ lat: number; lon: number } | null>(null)

  const handleSearch = useCallback((t: { lat: number; lon: number; name: string }) => {
    setSearchTarget({ lat: t.lat, lon: t.lon })
  }, [])

  return (
    <div className="relative w-screen h-screen bg-zinc-950 overflow-hidden">
      {/* Map fills the screen — buildings already visible everywhere */}
      <CadastreMap
        filter={filter}
        colourByUsage={colourByUsage}
        searchTarget={searchTarget}
        onBuildingClick={setSelected}
        onStatsUpdate={setVisibleCount}
      />

      {/* Top toolbar */}
      <Toolbar
        visibleCount={visibleCount}
        colourByUsage={colourByUsage}
        filter={filter}
        onFilterChange={setFilter}
        onColourToggle={() => setColourByUsage(v => !v)}
        onSearch={handleSearch}
      />

      {/* Building detail panel */}
      <BuildingPanel building={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
