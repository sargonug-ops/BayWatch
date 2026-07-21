/**
 * Feature property keys written into the zones GeoJSON source.
 * Keep in sync with buildZoneFeatures + layer filters/expressions.
 */
export const ZoneProps = {
  id: 'id',
  type: 'type',
  title: 'title',
  summary: 'summary',
  severity: 'severity',
  source: 'source',
  activeUntil: 'activeUntil',
  /** School-zone circle radius in meters (Point features only). */
  radiusMeters: 'radiusMeters',
} as const;

export type ZonePropKey = (typeof ZoneProps)[keyof typeof ZoneProps];
