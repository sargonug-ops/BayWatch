import type { Feature, FeatureCollection, Point, Position } from 'geojson';

import type { GeoJsonGeometry, Zone } from '../../data/models/mapState';
import { ZoneProps } from '../../data/models/zoneProps';
import { SCHOOL_ZONE_RADIUS_METERS } from '../constants';

type ZoneFeatureProperties = {
  [ZoneProps.id]: string;
  [ZoneProps.type]: Zone['type'];
  [ZoneProps.title]: string;
  [ZoneProps.summary]: string;
  [ZoneProps.severity]: number;
  [ZoneProps.source]: string;
  [ZoneProps.activeUntil]: string | null;
  [ZoneProps.radiusMeters]?: number;
};

/**
 * Pure: Zone[] → FeatureCollection for the Mapbox ShapeSource.
 *
 * Rule 6: school zones become Point features (CircleLayer), never dense polygons.
 * MultiPoint incidents are exploded to Point features for simpler hit-testing.
 * LineString / Polygon geometries are preserved as-is for Line/Fill layers.
 */
export function buildZoneFeatures(zones: Zone[]): FeatureCollection {
  const features: Feature[] = [];

  for (const zone of zones) {
    if (zone.type === 'SCHOOL_ZONE') {
      features.push(toSchoolPointFeature(zone));
      continue;
    }

    if (zone.geometry.type === 'MultiPoint') {
      features.push(...explodeMultiPoint(zone));
      continue;
    }

    features.push(toFeature(zone, zone.geometry));
  }

  return { type: 'FeatureCollection', features };
}

function baseProperties(zone: Zone): ZoneFeatureProperties {
  return {
    [ZoneProps.id]: zone.id,
    [ZoneProps.type]: zone.type,
    [ZoneProps.title]: zone.title,
    [ZoneProps.summary]: zone.summary,
    [ZoneProps.severity]: zone.severity,
    [ZoneProps.source]: zone.source,
    [ZoneProps.activeUntil]: zone.activeUntil,
  };
}

function toFeature(zone: Zone, geometry: GeoJsonGeometry): Feature {
  return {
    type: 'Feature',
    id: zone.id,
    properties: baseProperties(zone),
    geometry,
  };
}

function toSchoolPointFeature(zone: Zone): Feature<Point> {
  const center = geometryCenter(zone.geometry) ?? ([0, 0] as Position);
  return {
    type: 'Feature',
    id: zone.id,
    properties: {
      ...baseProperties(zone),
      [ZoneProps.radiusMeters]: SCHOOL_ZONE_RADIUS_METERS,
    },
    geometry: {
      type: 'Point',
      coordinates: center,
    },
  };
}

function explodeMultiPoint(zone: Zone): Feature<Point>[] {
  if (zone.geometry.type !== 'MultiPoint') return [];
  return zone.geometry.coordinates.map((coordinates, index) => ({
    type: 'Feature' as const,
    id: `${zone.id}:${index}`,
    properties: {
      ...baseProperties(zone),
      // Keep parent id for selection lookup in the store.
      [ZoneProps.id]: zone.id,
    },
    geometry: {
      type: 'Point' as const,
      coordinates,
    },
  }));
}

/** Best-effort center for converting school polygons → points. */
function geometryCenter(geometry: GeoJsonGeometry): Position | null {
  switch (geometry.type) {
    case 'Point':
      return geometry.coordinates;
    case 'MultiPoint':
    case 'LineString':
      return averagePositions(geometry.coordinates);
    case 'MultiLineString':
    case 'Polygon':
      return averagePositions(geometry.coordinates.flat());
    case 'MultiPolygon':
      return averagePositions(geometry.coordinates.flat(2));
    default:
      return null;
  }
}

function averagePositions(positions: Position[]): Position | null {
  if (positions.length === 0) return null;
  let lng = 0;
  let lat = 0;
  for (const [x, y] of positions) {
    lng += x;
    lat += y;
  }
  return [lng / positions.length, lat / positions.length];
}
