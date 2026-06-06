'use client'

import { useEffect, useRef } from 'react'
import type { BuildingProperties } from '@/lib/types'
import { registerPMTilesProtocol } from '@/lib/pmtiles-setup'

const PMTILES_URL  = process.env.NEXT_PUBLIC_PMTILES_URL   // served from CDN
const FALLBACK_API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

interface Props {
  filter:          { usage: string | null; minFloors: number; maxFloors: number }
  colourByUsage:   boolean
  searchTarget:    { lat: number; lon: number } | null
  onBuildingClick: (props: BuildingProperties | null) => void
  onStatsUpdate:   (count: number) => void
}

const USAGE_COLOURS: Record<string, string> = {
  Residential: '#b8d4ee',
  Commercial:  '#f5ddb8',
  Industrial:  '#d8b8f0',
  Civic:       '#b8f0d0',
}

export default function CadastreMap({
  filter, colourByUsage, searchTarget,
  onBuildingClick, onStatsUpdate,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const readyRef     = useRef(false)

  const onBuildingClickRef = useRef(onBuildingClick)
  const onStatsUpdateRef   = useRef(onStatsUpdate)
  useEffect(() => { onBuildingClickRef.current = onBuildingClick }, [onBuildingClick])
  useEffect(() => { onStatsUpdateRef.current   = onStatsUpdate   }, [onStatsUpdate])

  // ── Init map ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    ;(async () => {
      await registerPMTilesProtocol()
      const mod = await import('maplibre-gl')
      await import('maplibre-gl/dist/maplibre-gl.css')

      const map = new (mod as any).Map({
        container: containerRef.current!,
        style: 'https://tiles.openfreemap.org/styles/positron',
        center: [37.5, -0.5],   // Centred on Kenya
        zoom: 6.5,
        pitch: 0,
        bearing: 0,
        antialias: true,
      })

      map.doubleClickZoom.disable()
      map.addControl(new (mod as any).NavigationControl({ showCompass: true }), 'bottom-left')
      map.addControl(new (mod as any).ScaleControl({ unit: 'metric' }), 'bottom-left')

      map.on('load', async () => {
        // Remove Positron's own building fill
        map.getStyle().layers
          .filter((l: any) => /building/i.test(l.id) || /building/i.test(l['source-layer'] ?? ''))
          .forEach((l: any) => { try { map.removeLayer(l.id) } catch (_) {} })

        map.setLight({ anchor: 'map', color: '#fff', intensity: 0.45, position: [1.5, 310, 35] })

        // ── Building source ────────────────────────────────────────────────
        // If PMTiles URL is configured, load from the pre-built tile file.
        // Otherwise fall back to an on-demand API source (dev mode).
        if (PMTILES_URL) {
          map.addSource('buildings', {
            type: 'vector',
            url: `pmtiles://${PMTILES_URL}`,
            attribution: '© Kenya 3D Cadastre',
          })
        } else {
          // Dev fallback: load from the FastAPI backend as GeoJSON
          // (replace with actual URL in production)
          map.addSource('buildings', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          })
          console.warn('No NEXT_PUBLIC_PMTILES_URL set — buildings will not load in production mode')
        }

        const srcLayer = PMTILES_URL ? 'buildings' : undefined

        // Shadow
        map.addLayer({
          id: 'bldg-shadow', type: 'fill', source: 'buildings',
          ...(srcLayer ? { 'source-layer': srcLayer } : {}),
          filter: ['has', 'heightM'],
          paint: { 'fill-color': '#000', 'fill-opacity': 0.1, 'fill-translate': [3, 4] },
        })

        // Building extrusion
        map.addLayer({
          id: 'bldg-fill', type: 'fill-extrusion', source: 'buildings',
          ...(srcLayer ? { 'source-layer': srcLayer } : {}),
          filter: ['has', 'heightM'],
          minzoom: 13,
          paint: {
            'fill-extrusion-color': '#d6d3cf',
            'fill-extrusion-height': ['get', 'heightM'],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.93,
            'fill-extrusion-vertical-gradient': true,
          },
        })

        // Selection highlight
        map.addLayer({
          id: 'bldg-select', type: 'fill-extrusion', source: 'buildings',
          ...(srcLayer ? { 'source-layer': srcLayer } : {}),
          filter: ['==', 'buildingID', ''],
          minzoom: 13,
          paint: {
            'fill-extrusion-color': '#38bdf8',
            'fill-extrusion-height': ['+', ['get', 'heightM'], 1.5],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.85,
            'fill-extrusion-vertical-gradient': true,
          },
        })

        // Footprint outlines (visible at high zoom)
        map.addLayer({
          id: 'bldg-outline', type: 'line', source: 'buildings',
          ...(srcLayer ? { 'source-layer': srcLayer } : {}),
          minzoom: 16,
          paint: {
            'line-color': '#fff',
            'line-opacity': 0.08,
            'line-width': 0.5,
          },
        })

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

        // Update visible building count after any camera move
        const updateCount = () => {
          const features = map.queryRenderedFeatures({ layers: ['bldg-fill'] })
          onStatsUpdateRef.current(features.length)
        }
        map.on('moveend', updateCount)
        map.on('zoomend', updateCount)

        mapRef.current = map
        readyRef.current = true
      })
    })()

    return () => { mapRef.current?.remove(); mapRef.current = null; readyRef.current = false }
  }, [])

  // ── Filter ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!readyRef.current || !mapRef.current?.getLayer('bldg-fill')) return

    const conditions: any[] = ['all', ['has', 'heightM']]

    if (filter.usage) {
      conditions.push(['==', ['get', 'usage'], filter.usage])
    }
    if (filter.minFloors > 1) {
      conditions.push(['>=', ['get', 'floors'], filter.minFloors])
    }
    if (filter.maxFloors < 50) {
      conditions.push(['<=', ['get', 'floors'], filter.maxFloors])
    }

    const expr = conditions.length === 2 ? conditions[1] : conditions
    mapRef.current.setFilter('bldg-fill', expr)
    mapRef.current.setFilter('bldg-shadow', expr)
  }, [filter])

  // ── Colour mode ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!readyRef.current || !mapRef.current?.getLayer('bldg-fill')) return
    const colour = colourByUsage
      ? ['match', ['get', 'usage'],
          ...Object.entries(USAGE_COLOURS).flatMap(([k, v]) => [k, v]),
          '#d6d3cf']
      : '#d6d3cf'
    mapRef.current.setPaintProperty('bldg-fill', 'fill-extrusion-color', colour)
  }, [colourByUsage])

  // ── Fly to search target ────────────────────────────────────────────────────
  useEffect(() => {
    if (!readyRef.current || !searchTarget || !mapRef.current) return
    mapRef.current.flyTo({
      center: [searchTarget.lon, searchTarget.lat],
      zoom: 17, pitch: 52, bearing: -12, duration: 1200,
    })
  }, [searchTarget])

  return <div ref={containerRef} className="w-full h-full" />
}
