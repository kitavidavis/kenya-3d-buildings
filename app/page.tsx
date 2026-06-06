'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useRef } from 'react'
import Toolbar       from '@/components/Toolbar'
import BuildingPanel from '@/components/BuildingPanel'
import { fetchBuildings } from '@/lib/api'
import type { BuildingProperties, DataSource, QueryParams } from '@/lib/types'

const CadastreMap = dynamic(() => import('@/components/CadastreMap'), { ssr: false })

export default function Page() {
  const [geojson,       setGeojson]       = useState<GeoJSON.FeatureCollection | null>(null)
  const [selected,      setSelected]      = useState<BuildingProperties | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [source,        setSource]        = useState<DataSource>('osm')
  const [radius,        setRadius]        = useState(600)
  const [colourByUsage, setColourByUsage] = useState(false)
  const [queryLoc,      setQueryLoc]      = useState<{ lat: number; lon: number; radius: number } | null>(null)
  const [hintVisible,   setHintVisible]   = useState(true)

  const abortRef = useRef<AbortController | null>(null)

  // Derived stats
  const buildingCount = geojson
    ? geojson.features.filter(f => (f.properties as any)?.buildingID).length
    : null

  const totalGFA = geojson
    ? geojson.features.reduce((sum, f) => {
        const gfa = (f.properties as any)?.grossFloorAreaM2
        return sum + (typeof gfa === 'number' ? gfa : 0)
      }, 0)
    : null

  const handleDoubleClick = useCallback(async (lat: number, lon: number) => {
    // Cancel any in-flight request
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setHintVisible(false)
    setLoading(true)
    setError(null)
    setSelected(null)
    setQueryLoc({ lat, lon, radius })

    try {
      const data = await fetchBuildings(lat, lon, radius, source)
      setGeojson(data)
    } catch (e: any) {
      if (e.name !== 'AbortError') setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [radius, source])

  return (
    <div className="relative w-screen h-screen bg-zinc-950 overflow-hidden">

      {/* Full-screen map */}
      <CadastreMap
        geojson={geojson}
        queryLocation={queryLoc}
        selectedID={selected?.buildingID ?? null}
        colourByUsage={colourByUsage}
        onBuildingClick={setSelected}
        onDoubleClick={handleDoubleClick}
      />

      {/* Top toolbar */}
      <Toolbar
        loading={loading}
        buildingCount={buildingCount}
        totalGFA={totalGFA}
        source={source}
        radius={radius}
        colourByUsage={colourByUsage}
        onSourceChange={setSource}
        onRadiusChange={setRadius}
        onColourToggle={() => setColourByUsage(v => !v)}
      />

      {/* Building detail panel */}
      <BuildingPanel building={selected} onClose={() => setSelected(null)} />

      {/* First-use hint */}
      {hintVisible && !loading && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20
                        flex items-center gap-2.5 px-5 py-3 rounded-2xl
                        border border-white/10 shadow-xl
                        text-sm text-zinc-300 pointer-events-none select-none"
             style={{ background: 'rgba(10,11,16,0.88)', backdropFilter: 'blur(12px)' }}>
          <span className="text-lg">👆</span>
          <span>Double-click anywhere on the map to load buildings</span>
          <kbd className="ml-1 px-1.5 py-0.5 rounded bg-white/10 text-xs text-zinc-400 font-mono">
            {radius} m radius
          </kbd>
        </div>
      )}

      {/* Loading pulse overlay */}
      {loading && queryLoc && (
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
          <div className="relative">
            <div className="w-5 h-5 rounded-full bg-sky-400 opacity-80" />
            <div className="anim-ping absolute inset-0 rounded-full bg-sky-400" />
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30
                        max-w-sm px-4 py-2.5 rounded-xl border border-red-700/50
                        bg-red-950/90 text-red-300 text-sm shadow-2xl"
             onClick={() => setError(null)}>
          {error}
        </div>
      )}
    </div>
  )
}
