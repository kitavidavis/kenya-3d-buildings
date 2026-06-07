/**
 * solar.ts — Solar position & building shadow scoring
 *
 * For any building and its visible neighbours, computes how many daylight
 * hours it spends in shadow. Output: solar score 0–1 (1 = full sun all day).
 *
 * Sun position: simplified NOAA solar equations (±1° accuracy, sufficient
 * for architectural shadow estimation at building scale).
 */

const DEG = Math.PI / 180

// ── Solar position ────────────────────────────────────────────────────────────

export interface SunPosition {
  elevation: number   // degrees above horizon (negative = below)
  azimuth:   number   // degrees clockwise from north
}

/** Day-of-year (1–365) from a Date */
export function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff  = date.getTime() - start.getTime()
  return Math.floor(diff / 86_400_000)
}

/**
 * Compute sun position for a given latitude, longitude, date and hour.
 * Hour is in local solar time (0–24).
 */
export function sunPosition(
  latDeg:  number,
  lonDeg:  number,
  date:    Date,
  solarHour: number,   // local solar time, 0–24
): SunPosition {
  const doy    = dayOfYear(date)
  const lat    = latDeg * DEG

  // Solar declination (degrees)
  const decDeg = 23.45 * Math.sin(DEG * (360 / 365) * (doy - 81))
  const dec    = decDeg * DEG

  // Hour angle (degrees): 0 at solar noon, ±180 at midnight
  const ha = (solarHour - 12) * 15 * DEG

  // Elevation
  const sinElev = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha)
  const elevation = Math.asin(Math.max(-1, Math.min(1, sinElev))) / DEG

  // Azimuth (degrees, measured clockwise from north)
  const cosAz = (Math.sin(dec) - Math.sin(lat * DEG) * sinElev) /
                (Math.cos(lat * DEG) * Math.cos(elevation * DEG) + 1e-10)
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) / DEG
  if (Math.sin(ha) > 0) azimuth = 360 - azimuth

  return { elevation, azimuth }
}

/** Solar-time sunrise and sunset hours for a given lat on a given date */
export function sunriseSunset(latDeg: number, date: Date): [number, number] {
  const doy    = dayOfYear(date)
  const lat    = latDeg * DEG
  const decDeg = 23.45 * Math.sin(DEG * (360 / 365) * (doy - 81))
  const dec    = decDeg * DEG

  // Hour angle at sunrise/sunset (cos(ha) = -tan(lat)*tan(dec))
  const cosHa = -Math.tan(lat) * Math.tan(dec)
  if (cosHa < -1) return [0, 24]     // polar day
  if (cosHa >  1) return [12, 12]    // polar night (rare at Kenya latitudes)

  const ha     = Math.acos(cosHa) / DEG   // degrees
  const offset = ha / 15                  // hours from noon

  return [12 - offset, 12 + offset]
}

// ── Shadow geometry ───────────────────────────────────────────────────────────

/**
 * Given sun elevation (°) and azimuth (°), compute the shadow direction vector
 * and shadow length for a building of height h metres.
 * Shadow direction: unit vector [east, north] components.
 */
export function shadowVector(
  elevation: number,
  azimuth:   number,
  height:    number,
): { dx: number; dy: number; length: number } {
  if (elevation <= 0) return { dx: 0, dy: 0, length: Infinity }

  const elRad = elevation * DEG
  const azRad = azimuth   * DEG

  // Shadow length (metres) on flat ground
  const length = height / Math.tan(elRad)

  // Shadow points OPPOSITE to sun direction
  // Sun azimuth = clockwise from north → shadow is sun_az + 180°
  const shadowAz = azRad + Math.PI
  const dx = Math.sin(shadowAz)   // east component
  const dy = Math.cos(shadowAz)   // north component

  return { dx, dy, length }
}

// ── Per-building solar score ──────────────────────────────────────────────────

export interface BuildingCentroid {
  id:       string
  lng:      number
  lat:      number
  heightM:  number
}

/**
 * Returns the solar exposure score (0–1) for each building.
 *  1.0 = in full sunlight every hour of the day
 *  0.0 = completely shadowed all day
 *
 * Algorithm:
 *  • Sample every hour between sunrise and sunset
 *  • For each hour, for each building B, check if any neighbour A
 *    casts a shadow that covers B
 *  • Score = (unshaded hours) / (total daylight hours)
 *
 * Approximation: buildings are treated as point-like targets at their centroid.
 * Shadow source width ≈ sqrt(footprint) / 2 (circular approximation).
 */
export function computeSolarScores(
  buildings: BuildingCentroid[],
  latDeg:    number,   // representative lat (area centroid)
  date:      Date,
  hourStep   = 1,      // granularity (1 = hourly, 0.5 = 30-min)
): Map<string, number> {
  const scores = new Map<string, number>()
  if (!buildings.length) return scores

  // Metres per degree (approximate for Kenya latitudes)
  const mPerLat = 111_320
  const mPerLng = 111_320 * Math.cos(latDeg * DEG)

  const [rise, set] = sunriseSunset(latDeg, date)
  const daylight    = set - rise
  if (daylight <= 0) {
    buildings.forEach(b => scores.set(b.id, 0))
    return scores
  }

  // Build array of sample hours
  const hours: number[] = []
  for (let h = rise; h <= set; h += hourStep) hours.push(h)

  // For each building, count unshaded hours
  const unshadedCount = new Map<string, number>(buildings.map(b => [b.id, 0]))

  for (const hour of hours) {
    const sun = sunPosition(latDeg, 0, date, hour)
    if (sun.elevation <= 2) continue  // ignore very oblique angles (< 2°)

    for (const target of buildings) {
      let shaded = false

      for (const caster of buildings) {
        if (caster.id === target.id) continue
        if (caster.heightM <= target.heightM + 0.5) continue  // shorter building can't shade

        const sv = shadowVector(sun.elevation, sun.azimuth, caster.heightM - target.heightM)
        if (!isFinite(sv.length) || sv.length < 1) continue

        // Shadow endpoint in metres relative to caster
        const shadowEndDeltaLng = (sv.dx * sv.length) / mPerLng
        const shadowEndDeltaLat = (sv.dy * sv.length) / mPerLat

        // Is target within shadow cone? (footprint-width tolerance)
        const footprintRadius = 8   // metres — rough half-width of shadow stripe
        const toleranceLng    = footprintRadius / mPerLng
        const toleranceLat    = footprintRadius / mPerLat

        // Check if target centroid lies along the shadow line from caster
        // Parametric: point on shadow = caster + t * shadowDir, t ∈ [0,1]
        const cdx = (target.lng - caster.lng)
        const cdy = (target.lat - caster.lat)
        const dot = cdx * shadowEndDeltaLng + cdy * shadowEndDeltaLat
        const len2 = shadowEndDeltaLng ** 2 + shadowEndDeltaLat ** 2

        if (len2 < 1e-20) continue
        const t = Math.max(0, Math.min(1, dot / len2))

        const closestX = caster.lng + t * shadowEndDeltaLng
        const closestY = caster.lat + t * shadowEndDeltaLat

        const distLng = (target.lng - closestX) / toleranceLng
        const distLat = (target.lat - closestY) / toleranceLat
        const dist2   = distLng ** 2 + distLat ** 2

        if (dist2 < 1) { shaded = true; break }
      }

      if (!shaded) unshadedCount.set(target.id, (unshadedCount.get(target.id) ?? 0) + 1)
    }
  }

  const totalHours = hours.length || 1
  for (const b of buildings) {
    scores.set(b.id, (unshadedCount.get(b.id) ?? 0) / totalHours)
  }

  return scores
}

// ── Colour mapping ────────────────────────────────────────────────────────────

/**
 * Map solar score (0–1) to a hex colour for the fill-extrusion overlay.
 * Dark blue = deep shadow, gold = full sun.
 */
export function solarColour(score: number): string {
  // Interpolate: deep shadow (#1e3a5f) → mid (#f59e0b) → full sun (#fde68a)
  const stops: [number, [number, number, number]][] = [
    [0.00, [30,  58,  95 ]],   // #1e3a5f  deep shadow
    [0.30, [71,  85,  105]],   // #475569  partial shade
    [0.55, [161, 95,  34 ]],   // amber-dark
    [0.75, [245, 158, 11 ]],   // #f59e0b  partial sun
    [1.00, [253, 230, 138]],   // #fde68a  full sun
  ]

  const s = Math.max(0, Math.min(1, score))
  for (let i = 1; i < stops.length; i++) {
    const [t0, c0] = stops[i - 1]
    const [t1, c1] = stops[i]
    if (s <= t1) {
      const t = (s - t0) / (t1 - t0)
      const r = Math.round(c0[0] + t * (c1[0] - c0[0]))
      const g = Math.round(c0[1] + t * (c1[1] - c0[1]))
      const b = Math.round(c0[2] + t * (c1[2] - c0[2]))
      return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
    }
  }
  return '#fde68a'
}

/** Human-readable solar label */
export function solarLabel(score: number): string {
  if (score >= 0.85) return 'Full sun'
  if (score >= 0.65) return 'Mostly sunny'
  if (score >= 0.45) return 'Partial shade'
  if (score >= 0.25) return 'Mostly shaded'
  return 'Deep shadow'
}
