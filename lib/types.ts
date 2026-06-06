export interface BuildingProperties {
  buildingID: string
  name?: string
  floors: number
  heightM: number
  footprintAreaM2: number
  grossFloorAreaM2: number
  usage: 'Residential' | 'Commercial' | 'Industrial' | 'Civic' | 'Unknown'
  roofType: string
  yearBuilt: string
  osmID?: number
  wallColor?: string
}

export interface CityInfo {
  lat: number
  lon: number
  label: string
}

export type DataSource = 'osm' | 'microsoft'

export interface QueryParams {
  lat: number
  lon: number
  radius: number
  source: DataSource
}
