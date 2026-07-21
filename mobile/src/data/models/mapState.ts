/** Mirrors backend GET /api/v1/state contract. */

export type ZoneType = 'ROAD_CLOSURE' | 'TRAFFIC_EVENT' | 'SCHOOL_ZONE';

export type GeoJsonGeometry =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'MultiPoint'; coordinates: [number, number][] }
  | { type: 'LineString'; coordinates: [number, number][] }
  | { type: 'MultiLineString'; coordinates: [number, number][][] }
  | { type: 'Polygon'; coordinates: [number, number][][] }
  | { type: 'MultiPolygon'; coordinates: [number, number][][][] };

export type Zone = {
  id: string;
  type: ZoneType;
  title: string;
  summary: string;
  severity: number;
  geometry: GeoJsonGeometry;
  source: string;
  activeUntil: string | null;
};

export type TransitAlert = {
  id: string;
  agency: string;
  header: string;
  description: string;
  severity: number;
};

export type MapBbox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type MapState = {
  refreshedAt: string;
  bbox: MapBbox;
  zones: Zone[];
  transitAlerts: TransitAlert[];
  schoolZonesActive: boolean;
  demo: boolean;
};

export type DataSource = 'unknown' | 'live' | 'demo' | 'offline';
