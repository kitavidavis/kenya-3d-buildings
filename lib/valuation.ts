/**
 * valuation.ts — Kenya 3D Cadastre valuation engine
 *
 * Produces KES estimated market value for any building given its
 * footprint area, GFA, usage type, floor count, and county.
 *
 * Methodology:
 *   Base rate (KES/m² GFA) × usage multiplier × location multiplier
 *   × floor efficiency factor × age depreciation
 *
 * Rates are informed by Kenya Valuers Registration Board guidance,
 * Nairobi City County valuation rolls, and Knight Frank Kenya reports.
 * These are ESTIMATES only — not a formal valuation.
 */

// ── Base replacement cost (KES per m² of GFA) ────────────────────────────────
// Source: Kenya Building Cost Indices 2023 (average construction cost)
const BASE_COST_PER_M2: Record<string, number> = {
  Residential: 45_000,   // mid-range residential construction
  Commercial:  75_000,   // commercial fit-out + structure
  Industrial:  35_000,   // warehouse / industrial shell
  Civic:       55_000,   // public/institutional
  Unknown:     45_000,   // default to residential
}

// ── Location multiplier by county ────────────────────────────────────────────
// Nairobi prime = 2.5×, county HQs = 1.0–1.4×, remote = 0.5–0.7×
export const LOCATION_MULTIPLIER: Record<string, number> = {
  'Nairobi':          2.50,
  'Mombasa':          1.80,
  'Kisumu':           1.30,
  'Nakuru':           1.25,
  'Eldoret':          1.20,
  'Uasin Gishu':      1.20,
  'Kiambu':           1.60,   // Nairobi suburbs premium
  'Machakos':         1.10,
  'Kajiado':          1.15,
  'Thika':            1.20,
  'Meru':             1.05,
  'Nyeri':            1.05,
  'Murang\'a':        0.95,
  'Kirinyaga':        0.95,
  'Embu':             1.00,
  'Tharaka-Nithi':    0.85,
  'Kitui':            0.80,
  'Makueni':          0.80,
  'Nyandarua':        0.85,
  'Laikipia':         0.90,
  'Baringo':          0.80,
  'Elgeyo-Marakwet':  0.80,
  'Nandi':            0.85,
  'Kericho':          0.90,
  'Bomet':            0.80,
  'Narok':            0.85,
  'Samburu':          0.60,
  'West Pokot':       0.60,
  'Turkana':          0.55,
  'Trans-Nzoia':      0.90,
  'Bungoma':          0.85,
  'Kakamega':         0.90,
  'Vihiga':           0.85,
  'Busia':            0.80,
  'Kisii':            0.90,
  'Nyamira':          0.85,
  'Siaya':            0.80,
  'Homa Bay':         0.80,
  'Migori':           0.80,
  'Kwale':            0.90,
  'Kilifi':           0.95,
  'Malindi':          0.95,
  'Taita-Taveta':     0.75,
  'Tana River':       0.55,
  'Lamu':             1.00,   // tourism premium
  'Garissa':          0.65,
  'Wajir':            0.50,
  'Mandera':          0.50,
  'Isiolo':           0.70,
  'Marsabit':         0.55,
}

// ── Floor efficiency factor ───────────────────────────────────────────────────
// High-rises cost more per m² to build; value per GFA also rises
function floorFactor(floors: number): number {
  if (floors >= 20) return 1.40
  if (floors >= 10) return 1.25
  if (floors >= 5)  return 1.10
  if (floors >= 3)  return 1.00
  return 0.90   // single/double storey — lower structural cost
}

// ── Age depreciation ──────────────────────────────────────────────────────────
// Straight-line depreciation capped at 50% (buildings retain land value)
function ageFactor(yearBuilt: string | undefined): number {
  if (!yearBuilt || yearBuilt === 'Unknown') return 0.85   // assume mid-age
  const year = parseInt(yearBuilt, 10)
  if (isNaN(year)) return 0.85
  const age = new Date().getFullYear() - year
  if (age <= 0)  return 1.00
  if (age >= 50) return 0.50
  return 1.00 - (age / 50) * 0.50
}

// ── Annual rental yield rates ─────────────────────────────────────────────────
const YIELD_RATES: Record<string, number> = {
  Residential: 0.07,   // 7% gross yield
  Commercial:  0.09,
  Industrial:  0.08,
  Civic:       0.05,
  Unknown:     0.07,
}

// ── Main valuation function ───────────────────────────────────────────────────

export interface ValuationResult {
  estimatedValueKES:  number   // total estimated capital value
  valuePerM2KES:      number   // per GFA m²
  annualRentalKES:    number   // estimated gross annual rent
  monthlyRentalKES:   number
  farRatio:           number   // floor area ratio (GFA / footprint)
  builtUpPct:         number   // footprint / assumed parcel (footprint × 2.5)
  replacementCostKES: number   // rebuild cost (insurance basis)
  confidence:         'high' | 'medium' | 'low'
}

export function estimateValue(params: {
  gfa:        number          // gross floor area m²
  footprint:  number          // footprint m²
  floors:     number
  usage:      string
  city:       string
  yearBuilt?: string
  completenessScore?: number
}): ValuationResult {
  const { gfa, footprint, floors, usage, city, yearBuilt, completenessScore } = params

  const baseCost   = BASE_COST_PER_M2[usage]  ?? BASE_COST_PER_M2.Unknown
  const locMult    = LOCATION_MULTIPLIER[city] ?? 0.75
  const flrFactor  = floorFactor(floors)
  const ageDep     = ageFactor(yearBuilt)
  const yield_rate = YIELD_RATES[usage]        ?? YIELD_RATES.Unknown

  const replacementCostKES = baseCost * gfa * flrFactor
  const estimatedValueKES  = replacementCostKES * locMult * ageDep
  const valuePerM2KES      = gfa > 0 ? estimatedValueKES / gfa : 0
  const annualRentalKES    = estimatedValueKES * yield_rate
  const monthlyRentalKES   = annualRentalKES / 12

  // FAR = GFA / footprint
  const farRatio    = footprint > 0 ? gfa / footprint : floors
  // Assume parcel = footprint × 2.5 (typical plot coverage 40%)
  const parcelEst   = footprint * 2.5
  const builtUpPct  = parcelEst > 0 ? (footprint / parcelEst) * 100 : 40

  // Confidence based on data completeness
  const confidence: ValuationResult['confidence'] =
    (completenessScore ?? 0) >= 4 ? 'high' :
    (completenessScore ?? 0) >= 2 ? 'medium' : 'low'

  return {
    estimatedValueKES:  Math.round(estimatedValueKES),
    valuePerM2KES:      Math.round(valuePerM2KES),
    annualRentalKES:    Math.round(annualRentalKES),
    monthlyRentalKES:   Math.round(monthlyRentalKES),
    farRatio:           Math.round(farRatio * 100) / 100,
    builtUpPct:         Math.round(builtUpPct),
    replacementCostKES: Math.round(replacementCostKES),
    confidence,
  }
}

// ── Aggregate valuation for a set of buildings ────────────────────────────────

export interface AreaValuation {
  totalEstimatedValueKES: number
  totalGFA:               number
  totalFootprint:         number
  totalAnnualRentalKES:   number
  buildingCount:          number
  avgValuePerM2:          number
  usageBreakdown:         Record<string, { count: number; gfa: number; value: number }>
}

export function aggregateValuation(buildings: Array<{
  gfa: number; footprint: number; floors: number
  usage: string; city: string; yearBuilt?: string; completenessScore?: number
}>): AreaValuation {
  const usageBreakdown: AreaValuation['usageBreakdown'] = {}
  let totalValue = 0, totalGFA = 0, totalFP = 0, totalRent = 0

  for (const b of buildings) {
    const v = estimateValue(b)
    totalValue += v.estimatedValueKES
    totalGFA   += b.gfa
    totalFP    += b.footprint
    totalRent  += v.annualRentalKES

    const u = b.usage || 'Unknown'
    if (!usageBreakdown[u]) usageBreakdown[u] = { count: 0, gfa: 0, value: 0 }
    usageBreakdown[u].count++
    usageBreakdown[u].gfa   += b.gfa
    usageBreakdown[u].value += v.estimatedValueKES
  }

  return {
    totalEstimatedValueKES: Math.round(totalValue),
    totalGFA:               Math.round(totalGFA),
    totalFootprint:         Math.round(totalFP),
    totalAnnualRentalKES:   Math.round(totalRent),
    buildingCount:          buildings.length,
    avgValuePerM2:          totalGFA > 0 ? Math.round(totalValue / totalGFA) : 0,
    usageBreakdown,
  }
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatKES(value: number): string {
  if (value >= 1_000_000_000) return `KES ${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000)     return `KES ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)         return `KES ${(value / 1_000).toFixed(0)}K`
  return `KES ${value.toLocaleString()}`
}
