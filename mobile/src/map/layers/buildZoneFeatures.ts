import type { Feature, FeatureCollection, Point } from 'geojson';

import type { Zone } from '../../data/models/mapState';
import { ZoneProps } from '../../data/models/zoneProps';

type ZoneFeatureProperties = {
  [ZoneProps.id]: string;
  [ZoneProps.type]: Zone['type'];
  [ZoneProps.title]: string;
  [ZoneProps.summary]: string;
  [ZoneProps.severity]: number;
  [ZoneProps.source]: string;
  [ZoneProps.activeUntil]: string | null;
};

/**
 * Pure: Zone[] → FeatureCollection for the Mapbox ShapeSource.
 *
 * Geometry is preserved as the backend sends it:
 * - Polygon / MultiPolygon (school 150 m buffers, closures) → FillLayer
 * - LineString / MultiLineString (WZDx corridors) → LineLayer
 * - Point (stray WZDx incidents) → CircleLayer
 * MultiPoint is exploded into Point features for simpler hit-testing.
 */
export function buildZoneFeatures(zones: Zone[]): FeatureCollection {
  const features: Feature[] = [];

  for (const zone of zones) {
    if (zone.geometry.type === 'MultiPoint') {
      features.push(...explodeMultiPoint(zone));
      continue;
    }

    features.push(toFeature(zone));
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

function toFeature(zone: Zone): Feature {
  return {
    type: 'Feature',
    id: zone.id,
    properties: baseProperties(zone),
    geometry: zone.geometry,
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
