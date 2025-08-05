export interface OpenRouteServiceResponse {
  features: {
    geometry: {
      coordinates: [number, number][];
    };
  }[];
}
