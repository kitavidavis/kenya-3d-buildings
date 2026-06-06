/**
 * PMTiles protocol setup for MapLibre GL.
 * Call once before creating any Map instances.
 *
 * PMTiles lets us serve a single pre-built file from a CDN instead of
 * a live tile server. The entire Kenya building dataset is one file.
 */

let registered = false

export async function registerPMTilesProtocol() {
  if (registered || typeof window === 'undefined') return
  const { Protocol } = await import('pmtiles')
  const maplibre = await import('maplibre-gl')
  const protocol = new Protocol()
  ;(maplibre as any).addProtocol('pmtiles', protocol.tile.bind(protocol))
  registered = true
}
