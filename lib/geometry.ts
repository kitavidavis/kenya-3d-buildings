/**
 * geometry.ts — lightweight spatial helpers (no turf dependency)
 */

type LngLat = [number, number]   // [lng, lat]

/** Ray-casting point-in-polygon (Jordan curve theorem) */
export function pointInPolygon(point: LngLat, polygon: LngLat[]): boolean {
  const [px, py] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Shoelace formula — polygon area in square metres (approx, equirectangular).
 * Input: ring of [lng, lat] coordinates.
 */
export function polygonAreaM2(ring: LngLat[]): number {
  if (ring.length < 3) return 0
  const R   = 6_371_000   // Earth radius metres
  const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length   // centroid lat
  const kx  = (Math.PI / 180) * R * Math.cos((lat * Math.PI) / 180)
  const ky  = (Math.PI / 180) * R

  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] * kx) * (ring[i][1] * ky)
    area -= (ring[i][0] * kx) * (ring[j][1] * ky)
  }
  return Math.abs(area) / 2
}

/** Axis-aligned bounding box of a ring */
export function ringBBox(ring: LngLat[]): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of ring) {
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  return [minX, minY, maxX, maxY]
}

/** Centroid of a polygon ring */
export function ringCentroid(ring: LngLat[]): LngLat {
  const lng = ring.reduce((s, p) => s + p[0], 0) / ring.length
  const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length
  return [lng, lat]
}
