export type MapConfig = {
  modeView?: boolean;
  isDiary?: boolean;
  isStep?: boolean;
  zoomLevel: number;
  centerLat: number;
  centerLng: number;
};

export const mapConfigDefault: MapConfig = {
  modeView: true,
  isDiary: false,
  isStep: false,
  zoomLevel: 3,
  centerLat: 48.8566,
  centerLng: 2.3522,
};
