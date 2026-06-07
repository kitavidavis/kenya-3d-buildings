/**
 * devPotential.ts — Development Potential Engine
 *
 * For every building, computes the gap between its current GFA and the maximum
 * GFA permitted under Kenyan planning regulations (FAR limits by zone/county).
 * The headroom is then valued using the same replacement-cost methodology as
 * the valuation engine.
 *
 * Sources:
 *  - Nairobi City County Development Control Handbook 2024
 *  - Physical & Land Use Planning Act (Kenya, 2019)
 *  - County Spatial Plans (Mombasa, Kisumu, Nakuru, Eldoret)
 */

import type { BuildingProperties } from './types'
import { BASE_COST_PER_M2_MAP, LOCATION_MULTIPLIER } from './devPotentialConstants'

// ── Floor Area Ratio limits ───────────────────────────────────────────────────
// Keyed by [county][usage]; fallback = 'default'
const FAR_LIMITS: Record<string, Record<string, number>> = {
  Nairobi: {
    Commercial:  4.0,   // Nairobi CBD & Upper Hill
    Residential: 1.5,   // standard residential zone
    Industrial:  2.0,
    Civic:       2.5,
    Unknown:     1.5,
    default:     1.5,
  },
  Mombasa: {
    Commercial:  3.0,
    Residential: 1.5,
    Industrial:  1.8,
    Civic:       2.0,
    default:     1.5,
  },
  Kisumu: {
    Commercial:  2.5,
    Residential: 1.2,
    Industrial:  1.5,
    Civic:       2.0,
    default:     1.2,
  },
  Nakuru: {
    Commercial:  2.5,
    Residential: 1.2,
    Industrial:  1.5,
    default:     1.2,
  },
  'Uasin Gishu': {
    Commercial:  2.5,
    Residential: 1.2,
    default:     1.2,
  },
  Kiambu: {
    Commercial:  2.0,
    Residential: 1.5,
    default:     1.5,
  },
  Kajiado: {
    Commercial:  1.8,
    Residential: 1.2,
    default:     1.2,
  },
  default: {
    Commercial:  2.0,
    Residential: 1.0,
    Industrial:  1.5,
    Civic:       1.5,
    Unknown:     1.0,
    default:     1.0,
  },
}

// Maximum permitted floors by county (height control zones)
const MAX_FLOORS: Record<string, number> = {
  Nairobi:     60,
  Mombasa:     25,
  Kisumu:      20,
  Nakuru:      20,
  default:     15,
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DevelopmentPotential {
  currentGFA:        number   // m² (actual)
  permittedGFA:      number   // m² (max under FAR)
  headroomGFA:       number   // m² (= permitted − current)
  headroomPct:       number   // (headroom / permitted) × 100
  additionalFloors:  number   // how many more floors could be added
  currentFAR:        number   // actual FAR
  permittedFAR:      number
  unrealisedValueKES:number   // headroom × construction cost × location
  viabilityScore:    number   // 0–1 composite (headroom × location × usage demand)
  viabilityLabel:    'Prime'  | 'Strong' | 'Moderate' | 'Low' | 'Marginal'
  rationale:         string   // one-line explanation
}

// ── Main function ─────────────────────────────────────────────────────────────

export function computePotential(building: BuildingProperties): DevelopmentPotential {
  const usage      = building.usage    ?? 'Unknown'
  const city       = (building as any).city as string ?? 'Unknown'
  const footprint  = building.footprintAreaM2  ?? 50
  const currentGFA = building.grossFloorAreaM2 ?? footprint * (building.floors ?? 1)
  const floors     = building.floors   ?? 1

  // FAR limit
  const countyFAR  = FAR_LIMITS[city] ?? FAR_LIMITS.default
  const permittedFAR = countyFAR[usage] ?? countyFAR.default ?? 1.0
  const permittedGFA = permittedFAR * footprint

  const maxFloors  = MAX_FLOORS[city] ?? MAX_FLOORS.default

  // Headroom
  const headroomGFA  = Math.max(0, permittedGFA - currentGFA)
  const headroomPct  = permittedGFA > 0 ? (headroomGFA / permittedGFA) * 100 : 0
  const currentFAR   = footprint > 0 ? currentGFA / footprint : 0
  const additFloors  = Math.max(0, Math.floor(headroomGFA / footprint))
  const addlCapped   = Math.min(additFloors, maxFloors - floors)

  // Unrealised value: headroom GFA × construction cost × location multiplier
  const baseCost  = 45_000   // KES / m² (residential default — conservative)
  const locMult   = LOCATION_MULTIPLIER[city] ?? 0.75
  // Demand premium for commercial sites
  const usageMult = usage === 'Commercial' ? 1.3 : usage === 'Industrial' ? 0.9 : 1.0
  const unrealisedValueKES = Math.round(headroomGFA * baseCost * locMult * usageMult)

  // Viability score (0–1): headroom × location × demand
  const headroomScore  = Math.min(1, headroomPct / 100)
  const locationScore  = Math.min(1, (locMult - 0.5) / 2.0)   // 0.5→0, 2.5→1
  const demandScore    = usage === 'Commercial' ? 1.0 :
                         usage === 'Residential' ? 0.7 :
                         usage === 'Industrial'  ? 0.5 : 0.4
  const viabilityScore = headroomScore * 0.4 + locationScore * 0.4 + demandScore * 0.2

  const viabilityLabel: DevelopmentPotential['viabilityLabel'] =
    viabilityScore >= 0.72 ? 'Prime' :
    viabilityScore >= 0.55 ? 'Strong' :
    viabilityScore >= 0.38 ? 'Moderate' :
    viabilityScore >= 0.20 ? 'Low' : 'Marginal'

  const rationale = buildRationale(headroomPct, city, usage, floors, maxFloors, currentFAR, permittedFAR)

  return {
    currentGFA:        Math.round(currentGFA),
    permittedGFA:      Math.round(permittedGFA),
    headroomGFA:       Math.round(headroomGFA),
    headroomPct:       Math.round(headroomPct),
    additionalFloors:  addlCapped,
    currentFAR:        Math.round(currentFAR * 100) / 100,
    permittedFAR,
    unrealisedValueKES,
    viabilityScore:    Math.round(viabilityScore * 100) / 100,
    viabilityLabel,
    rationale,
  }
}

function buildRationale(
  headroomPct: number, city: string, usage: string,
  floors: number, maxFloors: number, currentFAR: number, permittedFAR: number,
): string {
  if (headroomPct < 5)  return `At or near maximum FAR (${currentFAR.toFixed(1)} / ${permittedFAR})`
  if (floors >= maxFloors) return `Height cap reached (${maxFloors} floors in ${city})`
  if (headroomPct > 60 && (city === 'Nairobi' || city === 'Mombasa'))
    return `Major redevelopment opportunity — only ${currentFAR.toFixed(1)}× used of ${permittedFAR}× permitted`
  if (headroomPct > 40)
    return `Significant upward potential: ${Math.round(permittedFAR - currentFAR) || 1}+ additional floors possible`
  return `${Math.round(headroomPct)}% of permitted FAR unused — ${usage.toLowerCase()} intensification viable`
}

// ── Aggregate potential for a drawn area ─────────────────────────────────────

export interface AreaPotential {
  totalHeadroomGFA:        number
  totalUnrealisedValueKES: number
  buildingCount:           number
  primeCount:              number
  strongCount:             number
  avgViabilityScore:       number
  topOpportunities:        Array<{ id: string; viabilityLabel: string; unrealisedValueKES: number }>
}

export function aggregatePotential(buildings: BuildingProperties[]): AreaPotential {
  let totalHeadroom = 0
  let totalValue    = 0
  let totalViability = 0
  let prime = 0, strong = 0
  const opps: AreaPotential['topOpportunities'] = []

  for (const b of buildings) {
    const p = computePotential(b)
    totalHeadroom  += p.headroomGFA
    totalValue     += p.unrealisedValueKES
    totalViability += p.viabilityScore
    if (p.viabilityLabel === 'Prime')  prime++
    if (p.viabilityLabel === 'Strong') strong++
    if (p.viabilityScore > 0.4) {
      opps.push({
        id:                String(b.osmID ?? b.buildingID),
        viabilityLabel:    p.viabilityLabel,
        unrealisedValueKES: p.unrealisedValueKES,
      })
    }
  }

  opps.sort((a, b) => b.unrealisedValueKES - a.unrealisedValueKES)

  return {
    totalHeadroomGFA:        Math.round(totalHeadroom),
    totalUnrealisedValueKES: Math.round(totalValue),
    buildingCount:           buildings.length,
    primeCount:              prime,
    strongCount:             strong,
    avgViabilityScore:       buildings.length
      ? Math.round((totalViability / buildings.length) * 100) / 100
      : 0,
    topOpportunities:        opps.slice(0, 5),
  }
}

// ── Colour mapping for map overlay ───────────────────────────────────────────

/** Map viability score 0–1 to a hex colour */
export function potentialColour(viabilityScore: number): string {
  const stops: [number, [number,number,number]][] = [
    [0.00, [63,  63,  70 ]],   // zinc-600  marginal
    [0.20, [30,  100, 73 ]],   // muted green
    [0.40, [22,  163, 74 ]],   // #16a34a  moderate
    [0.60, [250, 204, 21 ]],   // #facc15  strong
    [1.00, [234, 88,  12 ]],   // #ea580c  prime
  ]

  const s = Math.max(0, Math.min(1, viabilityScore))
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
  return '#ea580c'
}
