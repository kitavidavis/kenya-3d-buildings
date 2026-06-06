'use client'

import { useEffect, useRef } from 'react'
import type { BuildingProperties } from '@/lib/types'

interface Props {
  geojson:         GeoJSON.FeatureCollection | null
  queryLocation:   { lat: number; lon: number; radius: number } | null
  selectedID:      string | null
  colourByUsage:   boolean
  onBuildingClick: (props: BuildingProperties | null) => void
  onDoubleClick:   (lat: number, lon: number) => void
}

function circlePolygon(lat: number, lon: number, radiusM: number): GeoJSON.Feature {
  const coords: [number, number][] = []
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI
    const dLon = (radiusM * Math.cos(a)) / (111320 * Math.cos((lat * Math.PI) / 180))
    const dLat = (radiusM * Math.sin(a)) / 111320
    coords.push([lon + dLon, lat + dLat])
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} }
}

const USAGE_COLOURS: Record<string, string> = {
  Residential: '#b8d4ee',
  Commercial:  '#f5ddb8',
  Industrial:  '#d8b8f0',
  Civic:       '#b8f0d0',
}

export default function CadastreMap({
  geojson, queryLocation, selectedID, colourByUsage,
  onBuildingClick, onDoubleClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const readyRef     = useRef(false)

  /* callbacks change every render — keep latest via ref to avoid re-running the init effect */
  const onBuildingClickRef = useRef(onBuildingClick)
  const onDoubleClickRef   = useRef(onDoubleClick)
  useEffect(() => { onBuildingClickRef.current = onBuildingClick }, [onBuildingClick])
  useEffect(() => { onDoubleClickRef.current   = onDoubleClick   }, [onDoubleClick])

  // ── Initialise map once ────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    import('maplibre-gl').then(mod => {
      import('maplibre-gl/dist/maplibre-gl.css')

      const map = new (mod as any).Map({
        container: containerRef.current!,
        style: 'https://tiles.openfreemap.org/styles/positron',
        center: [36.8219, -1.2921],
        zoom: 13,
        pitch: 52,
        bearing: -12,
        antialias: true,
      })

      map.doubleClickZoom.disable()

      map.addControl(new (mod as any).NavigationControl({ showCompass: true }), 'bottom-left')
      map.addControl(new (mod as any).ScaleControl({ unit: 'metric' }), 'bottom-left')

      map.on('load', () => {
        // Remove Positron built-in building layers
        map.getStyle().layers
          .filter((l: any) => /building/i.test(l.id) || /building/i.test(l['source-layer'] ?? ''))
          .forEach((l: any) => { try { map.removeLayer(l.id) } catch (_) {} })

        map.setLight({ anchor: 'map', color: '#fff', intensity: 0.45, position: [1.5, 310, 35] })

        // Sources
        map.addSource('cadastre',     { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        map.addSource('query-circle', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })

        // Query radius ring
        map.addLayer({ id: 'q-fill',   type: 'fill', source: 'query-circle',
          paint: { 'fill-color': '#38bdf8', 'fill-opacity': 0.07 } })
        map.addLayer({ id: 'q-stroke', type: 'line', source: 'query-circle',
          paint: { 'line-color': '#38bdf8', 'line-width': 1.5,
                   'line-dasharray': [5, 3], 'line-opacity': 0.55 } })

        // Building shadow
        map.addLayer({ id: 'bldg-shadow', type: 'fill', source: 'cadastre',
          filter: ['has', 'heightM'],
          paint: { 'fill-color': '#000', 'fill-opacity': 0.1, 'fill-translate': [3, 4] } })

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

        // Selection highlight
        map.addLayer({ id: 'bldg-select', type: 'fill-extrusion', source: 'cadastre',
          filter: ['==', 'buildingID', ''],
          paint: {
            'fill-extrusion-color': '#38bdf8',
            'fill-extrusion-height': ['+', ['get', 'heightM'], 1.5],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.85,
            'fill-extrusion-vertical-gradient': true,
          } })

        // Interactions
        map.on('click', 'bldg-fill', (e: any) => {
          const f = e.features?.[0]
          if (f) onBuildingClickRef.current(f.properties as BuildingProperties)
        })
        map.on('click', (e: any) => {
          const fs = map.queryRenderedFeatures(e.point, { layers: ['bldg-fill'] })
          if (!fs.length) onBuildingClickRef.current(null)
        })
        map.on('mouseenter', 'bldg-fill', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'bldg-fill', () => { map.getCanvas().style.cursor = '' })
        map.on('dblclick',  (e: any) => { onDoubleClickRef.current(e.lngLat.lat, e.lngLat.lng) })

        mapRef.current = map
        readyRef.current = true
      })
    })

    return () => { mapRef.current?.remove(); mapRef.current = null; readyRef.current = false }
  }, [])

  // ── Sync buildings data ────────────────────────────────────────────────────
  useEffect(() => {
    if (!readyRef.current) return
    mapRef.current?.getSource('cadastre')
      ?.setData(geojson ?? { type: 'FeatureCollection', features: [] })

    if (geojson?.features.length) {
      const bldgs = geojson.features.filter((f: any) => f.properties?.buildingID)
      if (bldgs.length > 0) {
        let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity
        bldgs.forEach((f: any) => {
          if (f.geometry.type === 'Polygon') {
            f.geometry.coordinates[0].forEach(([lon, lat]: [number, number]) => {
              if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon
              if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat
            })
          }
        })
        mapRef.current?.flyTo({
          center: [(minLon + maxLon) / 2, (minLat + maxLat) / 2],
          zoom: 16.5, pitch: 52, bearing: -12, duration: 1000,
        })
      }
    }
  }, [geojson])

  // ── Sync colour mode ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!readyRef.current || !mapRef.current?.getLayer('bldg-fill')) return
    const expr = colourByUsage
      ? ['match', ['get', 'usage'],
          ...Object.entries(USAGE_COLOURS).flatMap(([k, v]) => [k, v]),
          '#d6d3cf']
      : '#d6d3cf'
    mapRef.current.setPaintProperty('bldg-fill', 'fill-extrusion-color', expr)
  }, [colourByUsage])

  // ── Sync query radius circle ───────────────────────────────────────────────
  useEffect(() => {
    if (!readyRef.current) return
    const src = mapRef.current?.getSource('query-circle')
    if (!src) return
    src.setData({
      type: 'FeatureCollection',
      features: queryLocation ? [circlePolygon(queryLocation.lat, queryLocation.lon, queryLocation.radius)] : [],
    })
  }, [queryLocation])

  // ── Sync selection ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!readyRef.current || !mapRef.current?.getLayer('bldg-select')) return
    mapRef.current.setFilter('bldg-select', ['==', 'buildingID', selectedID ?? ''])
  }, [selectedID])

  return <div ref={containerRef} className="w-full h-full" />
}
