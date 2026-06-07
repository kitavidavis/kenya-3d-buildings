/** Shared constants re-exported so devPotential.ts and valuation.ts don't circular-import */

export const BASE_COST_PER_M2_MAP: Record<string, number> = {
  Residential: 45_000,
  Commercial:  75_000,
  Industrial:  35_000,
  Civic:       55_000,
  Unknown:     45_000,
}

// Re-export the location multiplier table (same as valuation.ts)
export { LOCATION_MULTIPLIER } from './valuation'
