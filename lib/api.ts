const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function fetchBuildings(
  lat: number,
  lon: number,
  radius: number,
  source: 'osm' | 'microsoft' = 'osm',
): Promise<GeoJSON.FeatureCollection> {
  const url = `${API}/buildings?lat=${lat}&lon=${lon}&radius=${radius}&source=${source}&roads=true&parks=true`
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

export async function fetchCities(): Promise<{ label: string; lat: number; lon: number }[]> {
  const res = await fetch(`${API}/cities`)
  if (!res.ok) return []
  const data = await res.json()
  return data.cities ?? []
}

export function glbDownloadURL(lat: number, lon: number, radius: number, source: string, lod = 2) {
  return `${API}/buildings/glb?lat=${lat}&lon=${lon}&radius=${radius}&source=${source}&lod=${lod}`
}
