'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useRef } from 'react'
import Toolbar,            { type ColourMode }   from '@/components/Toolbar'
import BuildingPanel                             from '@/components/BuildingPanel'
import ZoomHint                                  from '@/components/ZoomHint'
import UsageLegend                               from '@/components/UsageLegend'
import ToolNav,            { type ActiveTool }   from '@/components/ToolNav'
import DrawAnalysePanel                          from '@/components/DrawAnalysePanel'
import DNAPanel                                  from '@/components/DNAPanel'
import SolarPanel                                from '@/components/SolarPanel'
import DevPotentialPanel                         from '@/components/DevPotentialPanel'
import GrowthPanel,        { type GrowthResult } from '@/components/GrowthPanel'
import FloodPanel                                from '@/components/FloodPanel'
import type { BuildingProperties }               from '@/lib/types'
import type { FilterState }                      from '@/components/FilterPanel'
import { exportCSV, exportPDFReport }            from '@/lib/export'

const CadastreMap = dynamic(() => import('@/components/CadastreMap'), { ssr: false })

const DEFAULT_FILTER: FilterState = { usage: null, minFloors: 1, maxFloors: 50 }

export default function Page() {
  // ── Core state ─────────────────────────────────────────────────────────────
  const [selected,     setSelected]     = useState<BuildingProperties | null>(null)
  const [colourMode,   setColourMode]   = useState<ColourMode>('flat')
  const [filter,       setFilter]       = useState<FilterState>(DEFAULT_FILTER)
  const [visibleCount, setVisibleCount] = useState<number | null>(null)
  const [zoom,         setZoom]         = useState(6)
  const [pitch,        setPitch]        = useState(58)
  const [searchTarget, setSearchTarget] = useState<{ lat: number; lon: number } | null>(null)

  // ── Active tool ────────────────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<ActiveTool>('explore')

  // ── Draw / DNA ─────────────────────────────────────────────────────────────
  const [drawResult, setDrawResult] = useState<{
    features: BuildingProperties[]
    polygon:  [number, number][]
  } | null>(null)
  const [dnaMode, setDnaMode] = useState(false)   // true = show DNAPanel after draw

  // ── Solar ──────────────────────────────────────────────────────────────────
  const [solarHour,  setSolarHour]  = useState(10)
  const [solarDate,  setSolarDate]  = useState(() => new Date())
  const [solarScores, setSolarScores] = useState<Map<string, number>>(new Map())

  // ── Development potential ──────────────────────────────────────────────────
  const [potentialBuildings, setPotentialBuildings] = useState<BuildingProperties[]>([])

  // ── Growth ────────────────────────────────────────────────────────────────
  const [growthResult, setGrowthResult] = useState<GrowthResult | null>(null)

  // ── Flood ─────────────────────────────────────────────────────────────────
  const [floodLevel,    setFloodLevel]    = useState(0)
  const [floodBuildings, setFloodBuildings] = useState<BuildingProperties[]>([])

  // ── Map fly-to ref (passed into DNAPanel) ─────────────────────────────────
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lon: number } | null>(null)

  // ── Derived flags ──────────────────────────────────────────────────────────
  const isDrawMode      = activeTool === 'draw' || activeTool === 'dna'
  const isSolarMode     = activeTool === 'solar'
  const isPotentialMode = activeTool === 'potential'
  const isGrowthMode    = activeTool === 'growth'
  const isFloodMode     = activeTool === 'flood'

  // ── Callbacks ──────────────────────────────────────────────────────────────

  const handleSearch = useCallback((t: { lat: number; lon: number; name: string }) => {
    setSearchTarget({ lat: t.lat, lon: t.lon })
  }, [])

  const handlePitchToggle = useCallback(() => {
    setPitch(p => p > 5 ? 0 : 58)
  }, [])

  const handleToolChange = useCallback((tool: ActiveTool) => {
    setActiveTool(tool)
    setDrawResult(null)
    if (tool !== 'growth') setGrowthResult(null)
    if (tool !== 'flood')  setFloodLevel(0)
    if (tool === 'explore') setSelected(null)
    setDnaMode(tool === 'dna')
  }, [])

  const handleDrawComplete = useCallback((features: BuildingProperties[], polygon: [number, number][]) => {
    setDrawResult({ features, polygon })
    setSelected(null)
  }, [])

  const handleFlyTo = useCallback((lat: number, lon: number) => {
    setSearchTarget({ lat, lon })
  }, [])

  // ── Right panel selection ──────────────────────────────────────────────────
  const showDrawPanel   = isDrawMode && !dnaMode && drawResult != null
  const showDNAPanel    = (activeTool === 'dna' || (isDrawMode && dnaMode)) && drawResult != null
  const showSolarPanel  = isSolarMode
  const showPotPanel    = isPotentialMode
  const showGrowthPanel = isGrowthMode
  const showFloodPanel  = isFloodMode
  const showBuilding    = !isDrawMode && !isSolarMode && !isPotentialMode && !isGrowthMode && !isFloodMode && selected != null

  return (
    <div className="relative w-screen h-screen bg-zinc-950 overflow-hidden">

      <CadastreMap
        filter={filter}
        colourMode={colourMode}
        pitch={pitch}
        drawMode={isDrawMode}
        solarMode={isSolarMode}
        solarHour={solarHour}
        solarDate={solarDate}
        potentialMode={isPotentialMode}
        floodLevel={floodLevel}
        growthFeatures={growthResult?.features ?? null}
        searchTarget={searchTarget ?? flyToTarget}
        onBuildingClick={setSelected}
        onStatsUpdate={setVisibleCount}
        onZoomChange={setZoom}
        onDrawComplete={handleDrawComplete}
        onSolarScores={setSolarScores}
        onPotentialBuildings={setPotentialBuildings}
        onFloodBuildings={setFloodBuildings}
      />

      {/* Left tool nav */}
      <ToolNav active={activeTool} onChange={handleToolChange} />

      {/* Top toolbar */}
      <Toolbar
        visibleCount={visibleCount}
        zoom={zoom}
        colourMode={colourMode}
        pitch={pitch}
        filter={filter}
        onFilterChange={setFilter}
        onColourMode={setColourMode}
        onPitchToggle={handlePitchToggle}
        onSearch={handleSearch}
      />

      <ZoomHint zoom={zoom} />

      {/* Usage legend — hide when overlay modes are active */}
      <UsageLegend visible={colourMode === 'usage' && !isSolarMode && !isPotentialMode} />

      {/* ── Right panels (mutually exclusive) ── */}

      {showBuilding && (
        <BuildingPanel building={selected} onClose={() => setSelected(null)} />
      )}

      {/* Draw tool has two sub-panels toggled by tab */}
      {isDrawMode && drawResult && (
        <>
          {/* Tab switcher for draw results */}
          {!dnaMode && (
            <DrawAnalysePanel
              features={drawResult.features}
              polygon={drawResult.polygon}
              onClose={() => { setDrawResult(null); handleToolChange('explore') }}
              onExport={(f, p) => exportCSV(f, p)}
            />
          )}
          {dnaMode && (
            <DNAPanel
              features={drawResult.features}
              polygon={drawResult.polygon}
              onClose={() => { setDrawResult(null); handleToolChange('explore') }}
              onFlyTo={handleFlyTo}
            />
          )}
        </>
      )}

      {/* Draw tool hint when no polygon yet */}
      {isDrawMode && !drawResult && (
        <div className="absolute top-16 right-3 z-10">
          <div className="px-4 py-3 rounded-2xl border border-white/[0.07] text-xs text-zinc-400 max-w-[200px]"
            style={{ background: 'rgba(10,11,16,0.92)', backdropFilter: 'blur(16px)' }}>
            <p className="font-semibold text-white mb-1">
              {activeTool === 'dna' ? '🧬 Urban DNA' : '📐 Draw & Analyse'}
            </p>
            <p>Click on the map to trace a polygon. Double-click to close.</p>
          </div>
        </div>
      )}

      {showSolarPanel && (
        <SolarPanel
          solarHour={solarHour}
          solarDate={solarDate}
          onHourChange={setSolarHour}
          onDateChange={setSolarDate}
          buildingCount={solarScores.size}
          scores={solarScores}
          onClose={() => handleToolChange('explore')}
        />
      )}

      {showPotPanel && (
        <DevPotentialPanel
          features={potentialBuildings}
          onClose={() => handleToolChange('explore')}
          onSelectBuilding={id => {
            const b = potentialBuildings.find(
              f => String(f.osmID ?? f.buildingID) === id
            )
            if (b) { setSelected(b); handleToolChange('explore') }
          }}
        />
      )}

      {showGrowthPanel && (
        <GrowthPanel
          onClose={() => handleToolChange('explore')}
          onGrowthData={setGrowthResult}
        />
      )}

      {showFloodPanel && (
        <FloodPanel
          floodLevel={floodLevel}
          onLevelChange={setFloodLevel}
          buildings={floodBuildings}
          onClose={() => { setFloodLevel(0); handleToolChange('explore') }}
        />
      )}
    </div>
  )
}
