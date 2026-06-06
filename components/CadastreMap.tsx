'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { BuildingProperties } from '@/lib/types'

// MapLibre is browser-only — imported inside useEffect
let maplibregl: typeof import('maplibre-gl') | null = null

interface Props {
  geojson: GeoJSON.FeatureCollection | null
  onBuildingClick: (props: BuildingProperties | null) => void
  selectedID: string | null
}

export default function CadastreMap({ geojson, onBuildingClick, selectedID }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<import('maplibre-gl').Map | null>(null)
  const [ready, setReady] = useState(false)

  // ── Boot MapLibre ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    import('maplibre-gl').then(mod => {
      maplibregl = mod
      import('maplibre-gl/dist/maplibre-gl.css')

      const map = new mod.Map({
        container: containerRef.current!,
        style: 'https://tiles.openfreemap.org/styles/positron',
        center: [36.8219, -1.2921],
        zoom: 13,
        pitch: 50,
        bearing: -15,
      } as any)

      map.addControl(new mod.NavigationControl({ showCompass: true }), 'bottom-left')
      map.addControl(new mod.ScaleControl({ unit: 'metric' }), 'bottom-left')

      map.on('load', () => {
        // Remove vector style buildings to avoid double-rendering
        map.getStyle().layers
          .filter(l => /building/i.test(l.id) || /building/i.test((l as any)['source-layer'] ?? ''))
          .forEach(l => { try { map.removeLayer(l.id) } catch (_) {} })

        // Directional light matching TU Delft aesthetic
        map.setLight({ anchor: 'map', color: '#fff', intensity: 0.45, position: [1.5, 310, 35] })

        // Sources (empty initially)
        map.addSource('cadastre', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })

        // Shadow
        map.addLayer({ id: 'bldg-shadow', type: 'fill', source: 'cadastre',
          filter: ['has', 'heightM'],
          paint: { 'fill-color': '#000', 'fill-opacity': 0.08, 'fill-translate': [3, 4] } })

        // Buildings
        map.addLayer({ id: 'bldg-fill', type: 'fill-extrusion', source: 'cadastre',
          filter: ['has', 'heightM'],
          paint: {
            'fill-extrusion-color': '#d6d3cf',
            'fill-extrusion-height': ['get', 'heightM'],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.93,
            'fill-extrusion-vertical-gradient': true,
          } })

        // Selection
        map.addLayer({ id: 'bldg-select', type: 'fill-extrusion', source: 'cadastre',
          filter: ['==', 'buildingID', ''],
          paint: {
            'fill-extrusion-color': '#4299e1',
            'fill-extrusion-height': ['+', ['get', 'heightM'], 1],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.8,
            'fill-extrusion-vertical-gradient': true,
          } })

        // Interactions
        map.on('click', 'bldg-fill', e => {
          const f = e.features?.[0]
          if (!f) return
          onBuildingClick(f.properties as BuildingProperties)
        })
        map.on('click', e => {
          const fs = map.queryRenderedFeatures(e.point, { layers: ['bldg-fill'] })
          if (!fs.length) onBuildingClick(null)
        })
        map.on('mouseenter', 'bldg-fill', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'bldg-fill', () => { map.getCanvas().style.cursor = '' })

        mapRef.current = map
        setReady(true)
      })
    })

    return () => { mapRef.current?.remove(); mapRef.current = null }
  }, [])

  // ── Update data ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return
    const src = mapRef.current.getSource('cadastre') as import('maplibre-gl').GeoJSONSource | undefined
    if (!src) return

    src.setData(geojson ?? { type: 'FeatureCollection', features: [] })

    if (geojson && geojson.features.length > 0) {
      // Fly to data centroid
      const bldgs = geojson.features.filter(f => f.properties?.buildingID)
      if (bldgs.length > 0) {
        let minLon=Infinity, maxLon=-Infinity, minLat=Infinity, maxLat=-Infinity
        bldgs.forEach(f => {
          if (f.geometry.type === 'Polygon') {
            f.geometry.coordinates[0].forEach(([lon, lat]) => {
              if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon
              if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat
            })
          }
        })
        mapRef.current.flyTo({
          center: [(minLon+maxLon)/2, (minLat+maxLat)/2],
          zoom: 16.5, pitch: 55, bearing: -15, duration: 1200
        })
      }
    }
  }, [geojson, ready])

  // ── Highlight selected building ────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return
    mapRef.current.setFilter('bldg-select', ['==', 'buildingID', selectedID ?? ''])
  }, [selectedID, ready])

  return <div ref={containerRef} className="w-full h-full" />
}
