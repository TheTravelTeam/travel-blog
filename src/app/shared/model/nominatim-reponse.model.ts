export interface NominatimResponse {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  category: string;
  type: string;
  place_rank: number;
  importance: number;
  addresstype: string;
  name?: string;
  display_name: string;
  address: Address;
  boundingbox: [string, string, string, string];
}

export interface Address {
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  municipality?: string;
  city_district?: string;
  county?: string;
  ISO3166_2_lvl6?: string;
  state?: string;
  ISO3166_2_lvl4?: string;
  region?: string;
  postcode?: string;
  continent?: string;
  country?: string;
  country_code?: string;
}
