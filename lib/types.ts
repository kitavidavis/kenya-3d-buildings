export interface BuildingProperties {
  buildingID:        string
  name?:             string
  city?:             string
  floors:            number
  heightM:           number
  footprintAreaM2:   number
  grossFloorAreaM2:  number
  usage:             'Residential' | 'Commercial' | 'Industrial' | 'Civic' | 'Unknown'
  roofType?:         string
  yearBuilt?:        string
  osmID?:            number
  sizeClass?:        'Micro' | 'Small' | 'Medium' | 'Large' | 'Major'
  completenessScore?: 1 | 2 | 3 | 4 | 5
  wallColor?:        string
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
