'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback } from 'react'
import BuildingPanel from '@/components/BuildingPanel'
import QueryBar from '@/components/QueryBar'
import { fetchBuildings, glbDownloadURL } from '@/lib/api'
import type { BuildingProperties, QueryParams } from '@/lib/types'

// MapLibre is browser-only — skip SSR
const CadastreMap = dynamic(() => import('@/components/CadastreMap'), { ssr: false })

export default function ExplorePage() {
  const [geojson,  setGeojson]  = useState<GeoJSON.FeatureCollection | null>(null)
  const [selected, setSelected] = useState<BuildingProperties | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [lastQuery, setLastQuery] = useState<QueryParams>({
    lat: -1.2884, lon: 36.8218, radius: 600, source: 'osm',
  })

  const buildingCount = geojson
    ? geojson.features.filter(f => f.properties?.buildingID).length
    : null

  const handleQuery = useCallback(async (p: QueryParams) => {
    setLoading(true)
    setError(null)
    setSelected(null)
    setLastQuery(p)
    try {
      const data = await fetchBuildings(p.lat, p.lon, p.radius, p.source)
      setGeojson(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleBuildingClick = useCallback((props: BuildingProperties | null) => {
    setSelected(props)
  }, [])

  const handleDownloadGLB = useCallback(() => {
    const url = glbDownloadURL(lastQuery.lat, lastQuery.lon, lastQuery.radius, lastQuery.source)
    window.open(url, '_blank')
  }, [lastQuery])

  return (
    <div className="relative w-screen h-screen bg-zinc-950 overflow-hidden">
      {/* Map fills the viewport */}
      <CadastreMap
        geojson={geojson}
        onBuildingClick={handleBuildingClick}
        selectedID={selected?.buildingID ?? null}
      />

      {/* Query bar — floats above map */}
      <QueryBar
        loading={loading}
        buildingCount={buildingCount}
        params={lastQuery}
        onQuery={handleQuery}
        onDownloadGLB={handleDownloadGLB}
      />

      {/* Building details panel */}
      <BuildingPanel
        building={selected}
        onClose={() => setSelected(null)}
      />

      {/* Error toast */}
      {error && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-700 text-red-200 text-sm px-4 py-2 rounded-lg shadow-lg z-30 max-w-md">
          {error}
        </div>
      )}
    </div>
  )
}
