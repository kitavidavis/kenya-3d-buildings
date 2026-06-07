'use client'

import { useEffect, useRef } from 'react'
import type { BuildingProperties } from '@/lib/types'
import { registerPMTilesProtocol } from '@/lib/pmtiles-setup'
import { pointInPolygon, ringBBox } from '@/lib/geometry'
import { computeSolarScores, sunPosition, solarColour, type BuildingCentroid } from '@/lib/solar'
import { computePotential, potentialColour } from '@/lib/devPotential'
import { distanceToNearestRiver, effectiveFloodDepth, SPREAD_M_PER_M } from '@/lib/floodEngine'

const PMTILES_URL = process.env.NEXT_PUBLIC_PMTILES_URL

const COUNTY_HQS: [string, number, number][] = [
  ["Nairobi",         -1.2884,  36.8218], ["Kiambu",          -1.0314,  36.8356],
  ["Murang'a",        -0.7243,  37.1529], ["Kirinyaga",       -0.4990,  37.2807],
  ["Nyeri",           -0.4167,  36.9500], ["Nyandarua",       -0.2716,  36.3766],
  ["Machakos",        -1.5218,  37.2695], ["Makueni",         -1.7835,  37.6344],
  ["Kitui",           -1.3666,  38.0099], ["Embu",            -0.5309,  37.4581],
  ["Tharaka-Nithi",   -0.3381,  37.6524], ["Meru",             0.0473,  37.6494],
  ["Isiolo",           0.3541,  37.5822], ["Marsabit",         2.3342,  37.9947],
  ["Kajiado",         -1.8511,  36.7763], ["Narok",           -1.0830,  35.8699],
  ["Nakuru",          -0.3031,  36.0800], ["Laikipia",         0.0172,  37.0744],
  ["Baringo",          0.4926,  35.7432], ["Elgeyo-Marakwet",  0.6699,  35.5110],
  ["Nandi",            0.2023,  35.0985], ["Uasin Gishu",      0.5143,  35.2698],
  ["Trans-Nzoia",      1.0174,  35.0062], ["Kericho",         -0.3697,  35.2836],
  ["Bomet",           -0.7863,  35.3423], ["Samburu",          1.0981,  36.6996],
  ["West Pokot",       1.2378,  35.1133], ["Turkana",          3.1191,  35.5970],
  ["Bungoma",          0.5636,  34.5607], ["Busia",            0.4612,  34.1113],
  ["Kakamega",         0.2831,  34.7523], ["Vihiga",           0.0768,  34.7219],
  ["Kisumu",          -0.1022,  34.7617], ["Siaya",           -0.0612,  34.2878],
  ["Homa Bay",        -0.5273,  34.4570], ["Migori",          -1.0634,  34.4731],
  ["Kisii",           -0.6816,  34.7667], ["Nyamira",         -0.5632,  34.9352],
  ["Mombasa",         -4.0435,  39.6682], ["Kwale",           -4.1735,  39.4522],
  ["Kilifi",          -3.6305,  39.8499], ["Malindi",         -3.2138,  40.1169],
  ["Taita-Taveta",    -3.3960,  38.5566], ["Tana River",      -1.4987,  40.0311],
  ["Lamu",            -2.2696,  40.9023], ["Garissa",         -0.4531,  39.6460],
  ["Wajir",            1.7471,  40.0573], ["Mandera",          3.9373,  41.8569],
]

const COUNTY_HQS_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: COUNTY_HQS.map(([name, lat, lon]) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [lon, lat] },
    properties: { name },
  })),
}

const HEIGHT_COLOUR = [
  'interpolate', ['linear'], ['coalesce', ['get', 'heightM'], 3],
    0, '#ede8df', 6, '#d8d4ce', 15, '#c2beb9', 30, '#a8a4a0', 60, '#7e7a76', 120, '#585451',
]

const USAGE_COLOURS: Record<string, string> = {
  Residential: '#93c5fd', Commercial: '#fcd34d', Industrial: '#c4b5fd', Civic: '#6ee7b7',
}

function buildColourExpr(mode: 'height' | 'usage' | 'flat'): any {
  if (mode === 'flat')  return '#d6d3cf'
  if (mode === 'usage') return ['match', ['get', 'usage'],
    ...Object.entries(USAGE_COLOURS).flatMap(([k, v]) => [k, v]), '#d6d3cf']
  return HEIGHT_COLOUR
}

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] }

/** Extract polygon ring coordinates from a MapLibre rendered feature */
function featureCentroid(f: any): [number, number] | null {
  const geom = f.geometry
  if (!geom) return null
  if (geom.type === 'Point') return [geom.coordinates[0], geom.coordinates[1]]
  if (geom.type === 'Polygon' && geom.coordinates?.[0]?.length) {
    const ring = geom.coordinates[0] as number[][]
    const lng = ring.reduce((s: number, p: number[]) => s + p[0], 0) / ring.length
    const lat = ring.reduce((s: number, p: number[]) => s + p[1], 0) / ring.length
    return [lng, lat]
  }
  if (geom.type === 'MultiPolygon' && geom.coordinates?.[0]?.[0]?.length) {
    const ring = geom.coordinates[0][0] as number[][]
    const lng = ring.reduce((s: number, p: number[]) => s + p[0], 0) / ring.length
    const lat = ring.reduce((s: number, p: number[]) => s + p[1], 0) / ring.length
    return [lng, lat]
  }
  return null
}

interface Props {
  filter:          { usage: string | null; minFloors: number; maxFloors: number }
  colourMode:      'height' | 'usage' | 'flat'
  pitch:           number
  drawMode:        boolean
  solarMode:       boolean
  solarHour:       number
  solarDate:       Date
  potentialMode:   boolean
  floodLevel:      number           // metres, 0 = disabled
  growthFeatures:  Array<{ id: string; state: 'added' | 'removed' | 'modified'; lat: number; lon: number }> | null
  searchTarget:    { lat: number; lon: number } | null
  onBuildingClick: (props: BuildingProperties | null) => void
  onStatsUpdate:   (count: number) => void
  onZoomChange:    (zoom: number) => void
  onDrawComplete:  (features: BuildingProperties[], polygon: [number, number][]) => void
  onSolarScores:   (scores: Map<string, number>) => void
  onPotentialBuildings: (features: BuildingProperties[]) => void
  onFloodBuildings:(features: BuildingProperties[]) => void
}

export default function CadastreMap({
  filter, colourMode, pitch, drawMode, solarMode, solarHour, solarDate,
  potentialMode, floodLevel, growthFeatures, searchTarget,
  onBuildingClick, onStatsUpdate, onZoomChange,
  onDrawComplete, onSolarScores, onPotentialBuildings, onFloodBuildings,
}: Props) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<any>(null)
  const readyRef      = useRef(false)
  const introFiredRef = useRef(false)

  // Mutable draw state (avoids closure-staleness issues)
  const drawVerticesRef  = useRef<[number, number][]>([])
  const drawModeRef      = useRef(drawMode)
  const solarModeRef     = useRef(solarMode)
  const solarHourRef     = useRef(solarHour)
  const solarDateRef     = useRef(solarDate)
  const potentialModeRef = useRef(potentialMode)
  const floodLevelRef    = useRef(floodLevel)

  // Always-current callback refs
  const onBuildingClickRef      = useRef(onBuildingClick)
  const onStatsUpdateRef        = useRef(onStatsUpdate)
  const onZoomChangeRef         = useRef(onZoomChange)
  const onDrawCompleteRef       = useRef(onDrawComplete)
  const onSolarScoresRef        = useRef(onSolarScores)
  const onPotentialBuildingsRef = useRef(onPotentialBuildings)
  const onFloodBuildingsRef     = useRef(onFloodBuildings)
  const colourModeRef           = useRef(colourMode)
  const pitchRef                = useRef(pitch)

  useEffect(() => { onBuildingClickRef.current      = onBuildingClick      }, [onBuildingClick])
  useEffect(() => { onStatsUpdateRef.current        = onStatsUpdate        }, [onStatsUpdate])
  useEffect(() => { onZoomChangeRef.current         = onZoomChange         }, [onZoomChange])
  useEffect(() => { onDrawCompleteRef.current       = onDrawComplete       }, [onDrawComplete])
  useEffect(() => { onSolarScoresRef.current        = onSolarScores        }, [onSolarScores])
  useEffect(() => { onPotentialBuildingsRef.current = onPotentialBuildings }, [onPotentialBuildings])
  useEffect(() => { onFloodBuildingsRef.current     = onFloodBuildings     }, [onFloodBuildings])
  useEffect(() => { colourModeRef.current           = colourMode           }, [colourMode])
  useEffect(() => { pitchRef.current                = pitch                }, [pitch])
  useEffect(() => { drawModeRef.current             = drawMode             }, [drawMode])
  useEffect(() => { solarModeRef.current            = solarMode            }, [solarMode])
  useEffect(() => { solarHourRef.current            = solarHour            }, [solarHour])
  useEffect(() => { solarDateRef.current            = solarDate            }, [solarDate])
  useEffect(() => { potentialModeRef.current        = potentialMode        }, [potentialMode])
  useEffect(() => { floodLevelRef.current           = floodLevel           }, [floodLevel])

  // ── Draw helpers ──────────────────────────────────────────────────────────

  function updateDrawSource(map: any, vertices: [number, number][]) {
    const ring = vertices.length >= 3 ? [...vertices, vertices[0]] : vertices
    const fc = {
      type: 'FeatureCollection' as const,
      features: [
        ...(vertices.length >= 3 ? [{
          type: 'Feature' as const,
          geometry: { type: 'Polygon' as const, coordinates: [ring] },
          properties: {},
        }] : []),
        ...(vertices.length >= 2 ? [{
          type: 'Feature' as const,
          geometry: { type: 'LineString' as const, coordinates: vertices },
          properties: {},
        }] : []),
        ...vertices.map(v => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: v },
          properties: {},
        })),
      ],
    }
    try { map.getSource('draw').setData(fc) } catch (_) {}
  }

  function finishPolygon(map: any) {
    const verts = drawVerticesRef.current
    if (verts.length < 3) { clearDraw(map); return }

    const ring  = [...verts, verts[0]]
    const [minX, minY, maxX, maxY] = ringBBox(verts)
    const sw    = map.project([minX, minY])
    const ne    = map.project([maxX, maxY])
    const raw: any[] = map.queryRenderedFeatures([sw, ne], { layers: ['bldg-fill'] })

    const inside: BuildingProperties[] = []
    const seen = new Set<string>()
    for (const f of raw) {
      const id = String(f.properties?.buildingID ?? f.properties?.osmID ?? Math.random())
      if (seen.has(id)) continue
      seen.add(id)
      inside.push(f.properties as BuildingProperties)
    }

    updateDrawSource(map, verts)
    onDrawCompleteRef.current(inside, ring as [number, number][])
  }

  function clearDraw(map: any) {
    drawVerticesRef.current = []
    try { map.getSource('draw')?.setData(EMPTY_FC) } catch (_) {}
  }

  // ── Solar overlay ─────────────────────────────────────────────────────────

  function refreshSolarOverlay(map: any) {
    if (!map?.getLayer('bldg-fill')) return

    const features: any[] = map.queryRenderedFeatures({ layers: ['bldg-fill'] })
    if (!features.length) {
      try { map.getSource('solar-overlay')?.setData(EMPTY_FC) } catch (_) {}
      onSolarScoresRef.current(new Map())
      return
    }

    // Build centroid array
    const centroids: BuildingCentroid[] = []
    for (const f of features) {
      const c = featureCentroid(f)
      if (!c) continue
      centroids.push({
        id:      String(f.properties?.buildingID ?? f.properties?.osmID ?? Math.random()),
        lng:     c[0],
        lat:     c[1],
        heightM: f.properties?.heightM ?? (f.properties?.floors ?? 1) * 3,
      })
    }

    const areaLat   = centroids.reduce((s, c) => s + c.lat, 0) / centroids.length
    const scores    = computeSolarScores(centroids, areaLat, solarDateRef.current, 1)

    // Build GeoJSON overlay coloured by score
    const overlayFeatures = features
      .map(f => {
        const id    = String(f.properties?.buildingID ?? f.properties?.osmID ?? '')
        const score = scores.get(id) ?? 0.5
        const c     = featureCentroid(f)
        if (!c) return null
        return {
          type: 'Feature' as const,
          geometry: f.geometry ?? { type: 'Point' as const, coordinates: c },
          properties: {
            ...f.properties,
            solarScore: score,
            solarColour: solarColour(score),
          },
        }
      })
      .filter(Boolean)

    try {
      map.getSource('solar-overlay')?.setData({
        type: 'FeatureCollection' as const,
        features: overlayFeatures as any[],
      })
    } catch (_) {}

    onSolarScoresRef.current(scores)
  }

  // ── Dev. Potential overlay ─────────────────────────────────────────────────

  function refreshPotentialOverlay(map: any) {
    if (!map?.getLayer('bldg-fill')) return

    const features: any[] = map.queryRenderedFeatures({ layers: ['bldg-fill'] })
    if (!features.length) {
      try { map.getSource('potential-overlay')?.setData(EMPTY_FC) } catch (_) {}
      onPotentialBuildingsRef.current([])
      return
    }

    const seen       = new Set<string>()
    const buildings: BuildingProperties[] = []
    const overlayFeatures: any[] = []

    for (const f of features) {
      const id = String(f.properties?.buildingID ?? f.properties?.osmID ?? Math.random())
      if (seen.has(id)) continue
      seen.add(id)

      const props = f.properties as BuildingProperties
      buildings.push(props)

      const p     = computePotential(props)
      const c     = featureCentroid(f)
      if (!c) continue

      overlayFeatures.push({
        type: 'Feature' as const,
        geometry: f.geometry ?? { type: 'Point' as const, coordinates: c },
        properties: {
          ...f.properties,
          viabilityScore:  p.viabilityScore,
          viabilityColour: potentialColour(p.viabilityScore),
        },
      })
    }

    try {
      map.getSource('potential-overlay')?.setData({
        type: 'FeatureCollection' as const,
        features: overlayFeatures,
      })
    } catch (_) {}

    onPotentialBuildingsRef.current(buildings)
  }

  // ── Map init ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    ;(async () => {
      await registerPMTilesProtocol()
      const mod = await import('maplibre-gl')
      await import('maplibre-gl/dist/maplibre-gl.css')

      const map = new (mod as any).Map({
        container:           containerRef.current!,
        style:               'https://tiles.openfreemap.org/styles/positron',
        center:              [36.8228, -1.2933],
        zoom:                15,
        minZoom:             14,
        pitch:               pitchRef.current,
        bearing:             -18,
        antialias:           true,
        customAttribution:   '© <a href="https://github.com/davidkitavi" target="_blank" rel="noopener">David Kitavi</a>',
      })

      map.doubleClickZoom.disable()
      map.addControl(new (mod as any).NavigationControl({ showCompass: true }), 'bottom-left')
      map.addControl(new (mod as any).ScaleControl({ unit: 'metric' }), 'bottom-left')
      map.on('zoom', () => onZoomChangeRef.current(map.getZoom()))

      map.on('load', async () => {
        // Remove basemap buildings
        map.getStyle().layers
          .filter((l: any) => /building/i.test(l.id) || /building/i.test(l['source-layer'] ?? ''))
          .forEach((l: any) => { try { map.removeLayer(l.id) } catch (_) {} })

        map.setLight({ anchor: 'map', color: '#fff8f0', intensity: 0.5, position: [1.5, 295, 40] })

        // ── County HQs ───────────────────────────────────────────────────
        map.addSource('county-hqs', { type: 'geojson', data: COUNTY_HQS_GEOJSON })
        map.addLayer({
          id: 'county-pulse', type: 'circle', source: 'county-hqs', maxzoom: 12,
          paint: {
            'circle-radius':         ['interpolate', ['linear'], ['zoom'], 5, 5, 11, 14],
            'circle-color':          '#38bdf8',
            'circle-opacity':        0.15,
            'circle-stroke-width':   1.5,
            'circle-stroke-color':   '#38bdf8',
            'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.6, 11, 0.3],
          },
        })
        map.addLayer({
          id: 'county-labels', type: 'symbol', source: 'county-hqs',
          minzoom: 8, maxzoom: 13,
          layout: {
            'text-field':  ['get', 'name'],
            'text-size':   ['interpolate', ['linear'], ['zoom'], 8, 10, 12, 13],
            'text-offset': [0, 1.3], 'text-anchor': 'top', 'text-font': ['Noto Sans Regular'],
          },
          paint: {
            'text-color':      '#e2e8f0',
            'text-halo-color': 'rgba(0,0,0,0.75)',
            'text-halo-width':  1.5,
            'text-opacity':    ['interpolate', ['linear'], ['zoom'], 8, 0, 9, 1, 12, 1, 13, 0],
          },
        })

        // ── Buildings ────────────────────────────────────────────────────
        if (PMTILES_URL) {
          map.addSource('buildings', { type: 'vector', url: `pmtiles://${PMTILES_URL}`, attribution: '© Kenya 3D Buildings — David Kitavi' })
        } else {
          map.addSource('buildings', { type: 'geojson', data: EMPTY_FC })
          console.warn('No NEXT_PUBLIC_PMTILES_URL — buildings not loaded')
        }
        const sl = PMTILES_URL ? { 'source-layer': 'buildings' } : {}

        map.addLayer({
          id: 'bldg-shadow', type: 'fill', source: 'buildings', ...sl, minzoom: 13,
          filter: ['has', 'heightM'],
          paint: { 'fill-color': '#000', 'fill-opacity': 0.08, 'fill-translate': [4, 5] },
        })
        map.addLayer({
          id: 'bldg-fill', type: 'fill-extrusion', source: 'buildings', ...sl, minzoom: 13,
          filter: ['has', 'heightM'],
          paint: {
            'fill-extrusion-color':             '#d6d3cf',
            'fill-extrusion-height':            ['coalesce', ['get', 'heightM'], 3],
            'fill-extrusion-base':              0,
            'fill-extrusion-opacity':           0.92,
            'fill-extrusion-vertical-gradient': true,
          },
        })
        map.addLayer({
          id: 'bldg-select', type: 'fill-extrusion', source: 'buildings', ...sl, minzoom: 13,
          filter: ['==', 'buildingID', ''],
          paint: {
            'fill-extrusion-color':             '#38bdf8',
            'fill-extrusion-height':            ['+', ['coalesce', ['get', 'heightM'], 3], 2],
            'fill-extrusion-base':              0,
            'fill-extrusion-opacity':           0.88,
            'fill-extrusion-vertical-gradient': true,
          },
        })
        map.addLayer({
          id: 'bldg-outline', type: 'line', source: 'buildings', ...sl, minzoom: 16,
          paint: { 'line-color': '#fff', 'line-opacity': 0.09, 'line-width': 0.6 },
        })

        // ── Solar overlay ─────────────────────────────────────────────────
        map.addSource('solar-overlay', { type: 'geojson', data: EMPTY_FC })
        map.addLayer({
          id: 'solar-fill', type: 'fill-extrusion', source: 'solar-overlay',
          minzoom: 13,
          layout: { visibility: 'none' },
          filter: ['has', 'solarScore'],
          paint: {
            'fill-extrusion-color':             ['get', 'solarColour'],
            'fill-extrusion-height':            ['coalesce', ['get', 'heightM'], 3],
            'fill-extrusion-base':              0,
            'fill-extrusion-opacity':           0.88,
            'fill-extrusion-vertical-gradient': false,
          },
        })

        // ── Development potential overlay ─────────────────────────────────
        map.addSource('potential-overlay', { type: 'geojson', data: EMPTY_FC })
        map.addLayer({
          id: 'potential-fill', type: 'fill-extrusion', source: 'potential-overlay',
          minzoom: 13,
          layout: { visibility: 'none' },
          filter: ['has', 'viabilityScore'],
          paint: {
            'fill-extrusion-color':             ['get', 'viabilityColour'],
            'fill-extrusion-height':            ['coalesce', ['get', 'heightM'], 3],
            'fill-extrusion-base':              0,
            'fill-extrusion-opacity':           0.90,
            'fill-extrusion-vertical-gradient': true,
          },
        })

        // ── Flood layers ──────────────────────────────────────────────────

        // Per-building flood overlay — GeoJSON recomputed on each level change
        map.addSource('flood-overlay', { type: 'geojson', data: EMPTY_FC })

        // Submerged building portions (depth-coloured dark blue)
        map.addLayer({
          id: 'flood-wet', type: 'fill-extrusion', source: 'flood-overlay',
          minzoom: 13,
          layout: { visibility: 'none' },
          filter: ['>', ['get', 'wetHeight'], 0],
          paint: {
            'fill-extrusion-color':   ['get', 'wetColour'],
            'fill-extrusion-height':  ['get', 'wetHeight'],
            'fill-extrusion-base':    0,
            'fill-extrusion-opacity': 0.92,
            'fill-extrusion-vertical-gradient': false,
          },
        })

        // Water surface — flat semi-transparent plane at floodLevel height
        // One polygon per building footprint so it follows the flood extent
        map.addLayer({
          id: 'flood-surface', type: 'fill-extrusion', source: 'flood-overlay',
          minzoom: 13,
          layout: { visibility: 'none' },
          filter: ['>', ['get', 'wetHeight'], 0],
          paint: {
            'fill-extrusion-color':   '#1e40af',
            'fill-extrusion-height':  ['get', 'surfaceHeight'],
            'fill-extrusion-base':    ['get', 'surfaceBase'],
            'fill-extrusion-opacity': 0.40,
            'fill-extrusion-vertical-gradient': false,
          },
        })

        // ── Draw layers ───────────────────────────────────────────────────
        map.addSource('draw', { type: 'geojson', data: EMPTY_FC })
        map.addLayer({
          id: 'draw-fill', type: 'fill', source: 'draw',
          filter: ['==', '$type', 'Polygon'],
          paint: { 'fill-color': '#8b5cf6', 'fill-opacity': 0.15 },
        })
        map.addLayer({
          id: 'draw-polygon-outline', type: 'line', source: 'draw',
          filter: ['==', '$type', 'Polygon'],
          paint: { 'line-color': '#8b5cf6', 'line-width': 2 },
        })
        map.addLayer({
          id: 'draw-line', type: 'line', source: 'draw',
          filter: ['==', '$type', 'LineString'],
          paint: { 'line-color': '#8b5cf6', 'line-width': 2, 'line-dasharray': [3, 2] },
        })
        map.addLayer({
          id: 'draw-vertex', type: 'circle', source: 'draw',
          filter: ['==', '$type', 'Point'],
          paint: {
            'circle-radius': 5, 'circle-color': '#8b5cf6',
            'circle-stroke-width': 2, 'circle-stroke-color': '#fff',
          },
        })

        // ── Growth dots ───────────────────────────────────────────────────
        map.addSource('growth', { type: 'geojson', data: EMPTY_FC })
        map.addLayer({
          id: 'growth-dots', type: 'circle', source: 'growth',
          paint: {
            'circle-radius': 6,
            'circle-color': ['match', ['get', 'state'],
              'added', '#34d399', 'removed', '#f87171', 'modified', '#fbbf24', '#94a3b8'],
            'circle-opacity': 0.85,
            'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff', 'circle-stroke-opacity': 0.5,
          },
        })

        // ── Click & interaction handlers ──────────────────────────────────
        map.on('click', (e: any) => {
          if (drawModeRef.current) {
            const { lng, lat } = e.lngLat
            drawVerticesRef.current = [...drawVerticesRef.current, [lng, lat]]
            updateDrawSource(map, drawVerticesRef.current)
            return
          }
          const fs = map.queryRenderedFeatures(e.point, { layers: ['bldg-fill'] })
          if (!fs.length) {
            map.setFilter('bldg-select', ['==', 'buildingID', ''])
            onBuildingClickRef.current(null)
          }
        })

        map.on('click', 'bldg-fill', (e: any) => {
          if (drawModeRef.current) return
          const f = e.features?.[0]
          if (!f) return
          map.setFilter('bldg-select', ['==', 'buildingID', f.properties.buildingID ?? ''])
          onBuildingClickRef.current(f.properties as BuildingProperties)
        })

        map.on('dblclick', (e: any) => {
          if (!drawModeRef.current) return
          e.preventDefault()
          finishPolygon(map)
        })

        map.on('mouseenter', 'bldg-fill', () => {
          if (!drawModeRef.current) map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', 'bldg-fill', () => {
          if (!drawModeRef.current) map.getCanvas().style.cursor = ''
        })

        const updateCount = () => {
          const fs = map.queryRenderedFeatures({ layers: ['bldg-fill'] })
          onStatsUpdateRef.current(fs.length)
          onZoomChangeRef.current(map.getZoom())
          // Refresh overlays when map moves
          if (solarModeRef.current)     refreshSolarOverlay(map)
          if (potentialModeRef.current) refreshPotentialOverlay(map)
        }
        map.on('moveend', updateCount)
        map.on('zoomend', updateCount)

        map.setPaintProperty('bldg-fill', 'fill-extrusion-color', buildColourExpr(colourModeRef.current))

        mapRef.current   = map
        readyRef.current = true

        // Cinematic fly-in
        if (!introFiredRef.current) {
          introFiredRef.current = true
          setTimeout(() => {
            if (!mapRef.current) return
            mapRef.current.flyTo({
              center: [36.8228, -1.2933], zoom: 14, pitch: 58, bearing: -18,
              duration: 2800, curve: 1.2,
              easing: (t: number) => t < 0.5 ? 2*t*t : -1+(4-2*t)*t,
            })
          }, 500)
        }
      })
    })()

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
      readyRef.current = false
      introFiredRef.current = false
    }
  }, [])

  // ── Draw mode: cursor + clear on exit ─────────────────────────────────────
  useEffect(() => {
    if (!readyRef.current || !mapRef.current) return
    const canvas = mapRef.current.getCanvas()
    canvas.style.cursor = drawMode ? 'crosshair' : ''
    if (!drawMode) clearDraw(mapRef.current)
  }, [drawMode])

  // ── Solar mode: toggle overlay visibility + refresh ───────────────────────
  useEffect(() => {
    if (!readyRef.current || !mapRef.current?.getLayer('solar-fill')) return
    mapRef.current.setLayoutProperty('solar-fill', 'visibility', solarMode ? 'visible' : 'none')
    // Dim regular buildings when solar mode is on
    mapRef.current.setPaintProperty('bldg-fill', 'fill-extrusion-opacity', solarMode ? 0.15 : 0.92)
    if (solarMode) refreshSolarOverlay(mapRef.current)
    else {
      try { mapRef.current.getSource('solar-overlay')?.setData(EMPTY_FC) } catch (_) {}
      onSolarScores(new Map())
    }
  }, [solarMode])

  // ── Solar hour / date change ───────────────────────────────────────────────
  useEffect(() => {
    if (!readyRef.current || !solarMode || !mapRef.current) return
    refreshSolarOverlay(mapRef.current)
  }, [solarHour, solarDate])

  // ── Development potential mode ─────────────────────────────────────────────
  useEffect(() => {
    if (!readyRef.current || !mapRef.current?.getLayer('potential-fill')) return
    mapRef.current.setLayoutProperty('potential-fill', 'visibility', potentialMode ? 'visible' : 'none')
    mapRef.current.setPaintProperty('bldg-fill', 'fill-extrusion-opacity', potentialMode ? 0.15 : 0.92)
    if (potentialMode) refreshPotentialOverlay(mapRef.current)
    else {
      try { mapRef.current.getSource('potential-overlay')?.setData(EMPTY_FC) } catch (_) {}
      onPotentialBuildings([])
    }
  }, [potentialMode])

  // ── Pitch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!readyRef.current || !mapRef.current) return
    mapRef.current.easeTo({ pitch, duration: 500 })
  }, [pitch])

  // ── Filter ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!readyRef.current || !mapRef.current?.getLayer('bldg-fill')) return
    const conds: any[] = ['all', ['has', 'heightM']]
    if (filter.usage)          conds.push(['==', ['get', 'usage'], filter.usage])
    if (filter.minFloors > 1)  conds.push(['>=', ['get', 'floors'], filter.minFloors])
    if (filter.maxFloors < 50) conds.push(['<=', ['get', 'floors'], filter.maxFloors])
    const expr = conds.length === 2 ? conds[1] : conds
    mapRef.current.setFilter('bldg-fill',   expr)
    mapRef.current.setFilter('bldg-shadow', expr)
  }, [filter])

  // ── Colour mode ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!readyRef.current || !mapRef.current?.getLayer('bldg-fill')) return
    if (solarMode || potentialMode) return  // overlays take priority
    mapRef.current.setPaintProperty('bldg-fill', 'fill-extrusion-color', buildColourExpr(colourMode))
  }, [colourMode, solarMode, potentialMode])

  // ── Growth features ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!readyRef.current || !mapRef.current?.getSource('growth')) return
    if (!growthFeatures) {
      mapRef.current.getSource('growth').setData(EMPTY_FC)
      return
    }
    mapRef.current.getSource('growth').setData({
      type: 'FeatureCollection' as const,
      features: growthFeatures.map(f => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [f.lon, f.lat] },
        properties: { state: f.state, id: f.id },
      })),
    })
  }, [growthFeatures])

  // ── Flood level — river-origin spreading ─────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!readyRef.current || !map?.getLayer('flood-wet')) return

    const active = floodLevel > 0
    const vis    = active ? 'visible' : 'none'

    map.setLayoutProperty('flood-wet',     'visibility', vis)
    map.setLayoutProperty('flood-surface', 'visibility', vis)

    if (!active) {
      try { map.getSource('flood-overlay')?.setData(EMPTY_FC) } catch (_) {}
      // Restore building fill
      map.setPaintProperty('bldg-fill', 'fill-extrusion-opacity', 0.92)
      onFloodBuildingsRef.current([])
      return
    }

    // Query all visible buildings
    const rawFeatures: any[] = map.queryRenderedFeatures({ layers: ['bldg-fill'] })
    const seen = new Set<string>()
    const buildings: BuildingProperties[] = []
    const overlayFeatures: any[] = []

    for (const f of rawFeatures) {
      const id = String(f.properties?.buildingID ?? f.properties?.osmID ?? Math.random())
      if (seen.has(id)) continue
      seen.add(id)

      const props = f.properties as BuildingProperties
      buildings.push(props)

      // Building centroid
      const c = featureCentroid(f)
      if (!c || !f.geometry) continue

      const [lng, lat] = c
      const distM    = distanceToNearestRiver(lng, lat)
      const wetDepth = effectiveFloodDepth(distM, floodLevel)
      if (wetDepth <= 0) continue   // building is dry — omit from overlay

      const bldgHeight = props.heightM ?? (props.floors ?? 1) * 3
      const wetHeight  = Math.min(bldgHeight, wetDepth)
      const dryHeight  = Math.max(0, bldgHeight - wetDepth)

      // Colour shifts from dark navy (shallow) → murky teal (deeper)
      const depthRatio = Math.min(1, wetDepth / 8)
      const r = Math.round(12  + depthRatio * 5)
      const g = Math.round(42  + depthRatio * 30)
      const bC = Math.round(74 + depthRatio * 50)
      const wetColour = `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bC.toString(16).padStart(2,'0')}`

      overlayFeatures.push({
        type:       'Feature' as const,
        geometry:   f.geometry,
        properties: {
          ...f.properties,
          wetHeight,
          wetColour,
          // Water surface: thin slab sitting just above the wet portion
          surfaceBase:   wetHeight,
          surfaceHeight: wetHeight + 0.3,
        },
      })

      // Raise bldg-fill base to wetDepth so only the dry portion shows in original colour
      // (handled via per-building overlay — we keep bldg-fill as backdrop at low opacity)
    }

    try {
      map.getSource('flood-overlay')?.setData({
        type: 'FeatureCollection' as const,
        features: overlayFeatures,
      })
    } catch (_) {}

    // Dim base building layer — flood overlay sits on top
    map.setPaintProperty('bldg-fill', 'fill-extrusion-opacity', 0.35)

    onFloodBuildingsRef.current(buildings)

  }, [floodLevel])

  // ── Search target ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!readyRef.current || !searchTarget || !mapRef.current) return
    mapRef.current.flyTo({
      center: [searchTarget.lon, searchTarget.lat], zoom: 15, pitch: 58,
      bearing: -18, duration: 1400, curve: 1.2,
    })
  }, [searchTarget])

  return (
    <div ref={containerRef} className="w-full h-full">
      {drawMode && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="px-4 py-2 rounded-full text-xs font-semibold text-white border border-violet-500/40 shadow-lg"
            style={{ background: 'rgba(139,92,246,0.2)', backdropFilter: 'blur(12px)' }}>
            Click to add vertices &nbsp;·&nbsp; Double-click to close polygon
          </div>
        </div>
      )}
    </div>
  )
}
