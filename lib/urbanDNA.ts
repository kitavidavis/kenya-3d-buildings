/**
 * urbanDNA.ts — Urban morphology fingerprint & neighbourhood similarity
 *
 * A 7-dimension vector that captures the structural character of any drawn area.
 * Similarity is computed as cosine similarity against 15 pre-calibrated reference
 * neighbourhoods across Kenya.
 */

import type { BuildingProperties } from './types'

// ── Dimension names (display order) ──────────────────────────────────────────
export const DNA_LABELS = [
  'Density',          // buildings / hectare
  'Vertical Index',   // how evenly tall (1 = uniform tower field)
  'Use Diversity',    // Shannon entropy of usage mix
  'Plot Uniformity',  // 1 = all same footprint size, 0 = wildly varied
  'Commercial Pull',  // fraction of GFA that is commercial
  'Coverage',         // Σ footprint / area
  'Height Equality',  // 1 - Gini(heights) → high = egalitarian skyline
] as const

export type DNALabel = typeof DNA_LABELS[number]

export interface DNAVector {
  density:          number   // raw  buildings/ha
  verticalIndex:    number   // raw  mean/max floors
  useDiversity:     number   // raw  normalised Shannon H
  plotUniformity:   number   // raw  1 − CV(footprint)
  commercialPull:   number   // raw  0–1
  coverage:         number   // raw  0–1
  heightEquality:   number   // raw  1 − Gini
  normalised:       number[] // 0–1 after global scaling, same order as DNA_LABELS
}

// ── Reference neighbourhoods (pre-calibrated) ────────────────────────────────
export interface RefNeighbourhood {
  name:      string
  county:    string
  character: string
  vector:    number[]   // already 0–1, order = DNA_LABELS
  lat:       number
  lon:       number
}

export const REFERENCE_NEIGHBOURHOODS: RefNeighbourhood[] = [
  {
    name: 'Nairobi CBD',       county: 'Nairobi',      lat: -1.2833, lon: 36.8167,
    character: 'Dense commercial core — towers & offices',
    vector: [0.90, 0.65, 0.75, 0.60, 0.92, 0.85, 0.55],
  },
  {
    name: 'Westlands',         county: 'Nairobi',      lat: -1.2631, lon: 36.8013,
    character: 'High-rise mixed-use corridor',
    vector: [0.75, 0.72, 0.80, 0.58, 0.80, 0.78, 0.60],
  },
  {
    name: 'Karen',             county: 'Nairobi',      lat: -1.3193, lon: 36.7149,
    character: 'Leafy low-density residential',
    vector: [0.12, 0.48, 0.18, 0.55, 0.04, 0.16, 0.72],
  },
  {
    name: 'Kilimani',          county: 'Nairobi',      lat: -1.2886, lon: 36.7818,
    character: 'Upmarket apartment density',
    vector: [0.68, 0.74, 0.38, 0.52, 0.18, 0.72, 0.60],
  },
  {
    name: 'Eastleigh',         county: 'Nairobi',      lat: -1.2740, lon: 36.8506,
    character: 'Ultra-dense commercial-residential mix',
    vector: [0.95, 0.52, 0.90, 0.35, 0.75, 0.92, 0.48],
  },
  {
    name: 'Industrial Area',   county: 'Nairobi',      lat: -1.3091, lon: 36.8550,
    character: 'Large-footprint warehouses & factories',
    vector: [0.28, 0.30, 0.14, 0.35, 0.08, 0.52, 0.68],
  },
  {
    name: 'Kibera-adjacent',   county: 'Nairobi',      lat: -1.3133, lon: 36.7877,
    character: 'Micro-plot informal high-density',
    vector: [0.98, 0.18, 0.20, 0.08, 0.06, 0.96, 0.82],
  },
  {
    name: 'Mombasa Old Town',  county: 'Mombasa',      lat: -4.0535, lon: 39.6717,
    character: 'Historic organic dense mixed-use',
    vector: [0.85, 0.38, 0.78, 0.30, 0.62, 0.88, 0.55],
  },
  {
    name: 'Nyali',             county: 'Mombasa',      lat: -4.0220, lon: 39.7100,
    character: 'Coastal mid-rise residential',
    vector: [0.42, 0.55, 0.35, 0.60, 0.16, 0.44, 0.65],
  },
  {
    name: 'Kisumu CBD',        county: 'Kisumu',       lat: -0.1022, lon: 34.7617,
    character: 'Compact lakeside commercial hub',
    vector: [0.62, 0.40, 0.72, 0.55, 0.78, 0.68, 0.55],
  },
  {
    name: 'Nakuru CBD',        county: 'Nakuru',       lat: -0.3031, lon: 36.0800,
    character: 'Rift Valley regional hub',
    vector: [0.55, 0.38, 0.65, 0.55, 0.68, 0.60, 0.58],
  },
  {
    name: 'Eldoret CBD',       county: 'Uasin Gishu',  lat:  0.5143, lon: 35.2698,
    character: 'Grain-belt commercial centre',
    vector: [0.50, 0.36, 0.60, 0.52, 0.70, 0.55, 0.60],
  },
  {
    name: 'Thika Town',        county: 'Kiambu',       lat: -1.0332, lon: 37.0693,
    character: 'Industrial-residential satellite city',
    vector: [0.55, 0.40, 0.58, 0.58, 0.42, 0.60, 0.58],
  },
  {
    name: 'Malindi Town',      county: 'Kilifi',       lat: -3.2138, lon: 40.1169,
    character: 'Coastal resort-residential mix',
    vector: [0.32, 0.35, 0.55, 0.60, 0.40, 0.35, 0.65],
  },
  {
    name: 'Garissa Town',      county: 'Garissa',      lat: -0.4531, lon: 39.6460,
    character: 'Sparse arid-zone market town',
    vector: [0.20, 0.25, 0.48, 0.50, 0.52, 0.25, 0.70],
  },
]

// ── Internal helpers ──────────────────────────────────────────────────────────

function mean(a: number[]): number {
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0
}

function stddev(a: number[], mu?: number): number {
  const m = mu ?? mean(a)
  return a.length < 2 ? 0 : Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length)
}

/** Shannon entropy, normalised 0–1 against log2(n_categories) */
function normalisedEntropy(counts: Record<string, number>): number {
  const total = Object.values(counts).reduce((s, v) => s + v, 0)
  if (!total) return 0
  let H = 0
  for (const v of Object.values(counts)) {
    if (!v) continue
    const p = v / total
    H -= p * Math.log2(p)
  }
  const maxH = Math.log2(Math.max(Object.keys(counts).length, 2))
  return H / maxH
}

/** Gini coefficient of an array of non-negative numbers */
function gini(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const total = sorted.reduce((s, v) => s + v, 0)
  if (!total) return 0
  let num = 0
  for (let i = 0; i < n; i++) num += (2 * (i + 1) - n - 1) * sorted[i]
  return num / (n * total)
}

/** Cosine similarity between two same-length vectors */
function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na  += a[i] * a[i]
    nb  += b[i] * b[i]
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0
}

// ── Global scale bounds (empirically calibrated for Kenya) ───────────────────
// [min, max] for each raw dimension; used to normalise to 0–1
const SCALE: [number, number][] = [
  [0,   150],    // density (bldgs/ha)
  [0,     1],    // verticalIndex
  [0,     1],    // useDiversity
  [0,     1],    // plotUniformity
  [0,     1],    // commercialPull
  [0,     1],    // coverage
  [0,     1],    // heightEquality
]

function normalise(raw: number[]): number[] {
  return raw.map((v, i) => {
    const [lo, hi] = SCALE[i]
    return hi > lo ? Math.min(1, Math.max(0, (v - lo) / (hi - lo))) : 0
  })
}

// ── Main computation ──────────────────────────────────────────────────────────

/**
 * Compute the Urban DNA vector for a set of buildings in a drawn polygon.
 * @param buildings  buildings inside the polygon (BuildingProperties[])
 * @param areaM2     polygon area in m² (from polygonAreaM2())
 */
export function computeDNA(
  buildings: BuildingProperties[],
  areaM2:    number,
): DNAVector | null {
  if (!buildings.length || areaM2 < 100) return null

  const areaHa = areaM2 / 10_000

  // 1. Density
  const density = buildings.length / areaHa

  // 2. Vertical index: mean(floors) / max(floors)
  const floors = buildings.map(b => b.floors ?? 1).filter(f => f > 0)
  const maxF   = Math.max(...floors, 1)
  const verticalIndex = mean(floors) / maxF

  // 3. Usage diversity (Shannon entropy)
  const usageCounts: Record<string, number> = {}
  for (const b of buildings) {
    const u = b.usage ?? 'Unknown'
    usageCounts[u] = (usageCounts[u] ?? 0) + 1
  }
  const useDiversity = normalisedEntropy(usageCounts)

  // 4. Plot uniformity: 1 - coefficient of variation of footprints
  const footprints = buildings.map(b => b.footprintAreaM2 ?? 50).filter(v => v > 0)
  const mu_fp      = mean(footprints)
  const cv_fp      = mu_fp > 0 ? stddev(footprints, mu_fp) / mu_fp : 0
  const plotUniformity = Math.max(0, 1 - Math.min(cv_fp, 1))

  // 5. Commercial pull: commercial GFA / total GFA
  let commGFA  = 0
  let totalGFA = 0
  for (const b of buildings) {
    const gfa = b.grossFloorAreaM2 ?? (b.footprintAreaM2 ?? 50) * (b.floors ?? 1)
    totalGFA += gfa
    if (b.usage === 'Commercial') commGFA += gfa
  }
  const commercialPull = totalGFA > 0 ? commGFA / totalGFA : 0

  // 6. Coverage: total footprint / area
  const totalFootprint = buildings.reduce((s, b) => s + (b.footprintAreaM2 ?? 50), 0)
  const coverage = Math.min(1, totalFootprint / areaM2)

  // 7. Height equality: 1 - Gini(heights)
  const heights     = buildings.map(b => b.heightM ?? (b.floors ?? 1) * 3).filter(h => h > 0)
  const heightEquality = 1 - gini(heights)

  const raw = [density, verticalIndex, useDiversity, plotUniformity,
                commercialPull, coverage, heightEquality]

  return {
    density, verticalIndex, useDiversity, plotUniformity,
    commercialPull, coverage, heightEquality,
    normalised: normalise(raw),
  }
}

// ── Similarity search ─────────────────────────────────────────────────────────

export interface SimilarityMatch {
  neighbourhood: RefNeighbourhood
  score:         number   // 0–1 cosine similarity
  pct:           number   // 0–100
}

export function findSimilar(dna: DNAVector, topN = 3): SimilarityMatch[] {
  return REFERENCE_NEIGHBOURHOODS
    .map(n => ({
      neighbourhood: n,
      score: cosineSim(dna.normalised, n.vector),
      pct:   0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(m => ({ ...m, pct: Math.round(m.score * 100) }))
}

// ── Text label from DNA ───────────────────────────────────────────────────────

export function dnaLabel(dna: DNAVector): string {
  const n = dna.normalised
  const density   = n[0]
  const diversity = n[2]
  const commercial = n[4]
  const coverage  = n[5]

  if (density > 0.8 && commercial > 0.6)  return 'Urban Core'
  if (density > 0.8 && coverage > 0.85)   return 'Dense Informal'
  if (density > 0.6 && diversity > 0.6)   return 'Mixed-use Hub'
  if (density > 0.5 && commercial > 0.5)  return 'Commercial Strip'
  if (density < 0.2 && coverage < 0.25)   return 'Low-density Residential'
  if (density < 0.4 && diversity < 0.3)   return 'Suburban Residential'
  if (n[1] > 0.6)                          return 'High-rise Precinct'
  if (n[3] > 0.7 && density < 0.4)        return 'Planned Estate'
  return 'Mixed Residential'
}
