/**
 * floodEngine.ts — Nairobi river-origin flood simulation
 *
 * Rivers: Nairobi River, Mathare River, Ngong River, Kirichwa River,
 *         Gitathuru River, Karura River
 *
 * Flood depth at any building = max(0, floodLevel − distanceToRiver / SPREAD_M_PER_M)
 *
 * SPREAD_M_PER_M = 250:
 *   1 m flood → reaches 250 m from bank  (flash flood / narrow floodplain)
 *   3 m flood → reaches 750 m            (moderate, affects Mathare valley)
 *   5 m flood → reaches 1 250 m          (severe, Kibera / Westlands lowlands)
 *  10 m flood → reaches 2 500 m          (extreme — most of low-lying Nairobi)
 *
 * Coordinates sourced from OpenStreetMap river centrelines, simplified to
 * ~50 m accuracy. All [lng, lat].
 */

export const SPREAD_M_PER_M = 250

export interface RiverLine {
  name:   string
  coords: [number, number][]
}

/**
 * Nairobi River
 * Originates west of the city (Kikuyu escarpment), flows east through
 * Westlands, skirts the south edge of CBD, passes through Industrial Area,
 * then north-east toward Ruaraka before joining the Athi system.
 */
const NAIROBI_RIVER: RiverLine = {
  name: 'Nairobi River',
  coords: [
    [36.7020, -1.2780],   // Dagoretti / Kikuyu fringe
    [36.7280, -1.2820],   // Kangemi
    [36.7520, -1.2840],   // Mountain View
    [36.7720, -1.2850],   // Westlands (near Waiyaki Way bridge)
    [36.7900, -1.2860],   // Parklands / Ngara fringe
    [36.8050, -1.2880],   // Pangani / Ngara
    [36.8180, -1.2920],   // south of CBD (near River Road / Haile Selassie)
    [36.8300, -1.2960],   // Industrial Area west
    [36.8450, -1.3010],   // Industrial Area
    [36.8620, -1.3050],   // Industrial Area east / South B
    [36.8820, -1.3080],   // Embakasi fringe
    [36.9050, -1.3070],   // Ruaraka
    [36.9300, -1.3020],   // Kasarani fringe — river curves north-east here
    [36.9550, -1.2950],
  ],
}

/**
 * Mathare River
 * Flows south-east through Mathare valley (one of the most flood-prone
 * informal settlements in Nairobi), joins the Nairobi River near Pangani.
 */
const MATHARE_RIVER: RiverLine = {
  name: 'Mathare River',
  coords: [
    [36.8220, -1.2480],   // Muthaiga North / Garden Estate fringe
    [36.8300, -1.2540],   // Mathare North
    [36.8380, -1.2600],   // Mathare 4A
    [36.8430, -1.2660],   // Mathare central
    [36.8460, -1.2730],   // Kariobangi South fringe
    [36.8480, -1.2820],   // Pangani — confluences with Nairobi River
  ],
}

/**
 * Ngong River
 * Flows from the Ngong Hills north-east through Karen, Kibera (affecting
 * hundreds of thousands of residents), Langata, then joins the Nairobi River
 * at the Industrial Area.
 */
const NGONG_RIVER: RiverLine = {
  name: 'Ngong River',
  coords: [
    [36.7200, -1.3600],   // Ngong Hills foothills
    [36.7350, -1.3480],   // Karen (near Hardy)
    [36.7500, -1.3350],   // Karen / Kibera fringe
    [36.7620, -1.3200],   // Kibera south
    [36.7750, -1.3100],   // Kibera central
    [36.7900, -1.3050],   // Kibera north / Langata
    [36.8050, -1.3020],   // Nairobi West / South B
    [36.8200, -1.3000],   // South C
    [36.8350, -1.3010],   // joining Nairobi River near Industrial Area
  ],
}

/**
 * Kirichwa River (Kirichwa Ndogo / Kilimani tributary)
 * Flows north through Kilimani, Hurlingham and Lower Kabete before
 * draining into the Ngong River. Responsible for flooding along
 * Ngong Road and Kilimani estates.
 */
const KIRICHWA_RIVER: RiverLine = {
  name: 'Kirichwa River',
  coords: [
    [36.7720, -1.3020],   // Langata Road / Kibera fringe
    [36.7780, -1.2960],   // Nairobi West
    [36.7830, -1.2880],   // Kilimani south
    [36.7870, -1.2820],   // Kilimani (near Ngong Road)
    [36.7900, -1.2760],   // Hurlingham
    [36.7920, -1.2700],   // Upper Hill fringe
    [36.7940, -1.2640],   // Valley Arcade fringe — joins Ngong River
  ],
}

/**
 * Gitathuru River
 * Flows south through Muthaiga and Garden Estate then into Mathare River.
 * Causes frequent flooding in Muthaiga and Thome Estate.
 */
const GITATHURU_RIVER: RiverLine = {
  name: 'Gitathuru River',
  coords: [
    [36.8300, -1.2280],   // Thome / Githurai Road
    [36.8310, -1.2340],   // Garden Estate
    [36.8320, -1.2400],   // Muthaiga North
    [36.8330, -1.2460],   // Muthaiga — joins Mathare River
  ],
}

/**
 * Karura River
 * Flows east through Karura Forest and Spring Valley before
 * joining the Gitathuru / Mathare system near Muthaiga.
 */
const KARURA_RIVER: RiverLine = {
  name: 'Karura River',
  coords: [
    [36.7900, -1.2200],   // Karura Forest west
    [36.8000, -1.2220],   // Karura Forest central
    [36.8100, -1.2250],   // Karura Forest east
    [36.8180, -1.2280],   // Spring Valley
    [36.8250, -1.2320],   // Muthaiga fringe — joins Gitathuru
  ],
}

export const NAIROBI_RIVERS: RiverLine[] = [
  NAIROBI_RIVER,
  MATHARE_RIVER,
  NGONG_RIVER,
  KIRICHWA_RIVER,
  GITATHURU_RIVER,
  KARURA_RIVER,
]

// ── Pre-flatten segments ──────────────────────────────────────────────────────

interface Segment { ax: number; ay: number; bx: number; by: number }

const ALL_SEGMENTS: Segment[] = NAIROBI_RIVERS.flatMap(r =>
  r.coords.slice(0, -1).map((a, i) => ({
    ax: a[0], ay: a[1],
    bx: r.coords[i + 1][0], by: r.coords[i + 1][1],
  }))
)

// ── Distance helpers ──────────────────────────────────────────────────────────

const DEG_TO_M_LAT = 111_320

function mPerLng(lat: number) { return DEG_TO_M_LAT * Math.cos(lat * Math.PI / 180) }

/** Minimum distance in metres from point [px,py] to segment A→B */
function pointSegDistM(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
  mPerX: number,
): number {
  const dx = (bx - ax) * mPerX,   dy = (by - ay) * DEG_TO_M_LAT
  const len2 = dx * dx + dy * dy
  if (len2 < 1e-10) {
    const ex = (px - ax) * mPerX, ey = (py - ay) * DEG_TO_M_LAT
    return Math.sqrt(ex * ex + ey * ey)
  }
  const t  = Math.max(0, Math.min(1,
    ((px - ax) * mPerX * dx + (py - ay) * DEG_TO_M_LAT * dy) / len2
  ))
  const cx = ax + t * (bx - ax), cy = ay + t * (by - ay)
  const ex = (px - cx) * mPerX,  ey = (py - cy) * DEG_TO_M_LAT
  return Math.sqrt(ex * ex + ey * ey)
}

/** Distance in metres from [lng, lat] to the nearest Nairobi river segment */
export function distanceToNearestRiver(lng: number, lat: number): number {
  const mX = mPerLng(lat)
  let min  = Infinity
  for (const s of ALL_SEGMENTS) {
    const d = pointSegDistM(lng, lat, s.ax, s.ay, s.bx, s.by, mX)
    if (d < min) min = d
  }
  return min
}

/**
 * Flood depth (metres) at a given distance from the nearest river.
 * Returns 0 if the point is outside the flood extent.
 */
export function effectiveFloodDepth(distanceM: number, floodLevel: number): number {
  return Math.max(0, floodLevel - distanceM / SPREAD_M_PER_M)
}

// ── GeoJSON for rendering ─────────────────────────────────────────────────────

export const RIVERS_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: NAIROBI_RIVERS.map(r => ({
    type:     'Feature'    as const,
    geometry: { type: 'LineString' as const, coordinates: r.coords },
    properties: { name: r.name },
  })),
}
