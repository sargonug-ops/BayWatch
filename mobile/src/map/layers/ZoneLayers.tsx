import React, { memo, useCallback, useMemo } from 'react';
import {
  CircleLayer,
  FillLayer,
  LineLayer,
  ShapeSource,
} from '@rnmapbox/maps';

import { ZoneProps } from '../../data/models/zoneProps';
import {
  LAYER_CIRCLE,
  LAYER_CIRCLE_HIGHLIGHT,
  LAYER_FILL,
  LAYER_FILL_HIGHLIGHT,
  LAYER_LINE,
  LAYER_LINE_HIGHLIGHT,
  SRC_ZONES,
} from '../constants';
import {
  useSelectedZoneId,
  useZones,
  useMapStore,
} from '../../state/mapStore';
import { buildZoneFeatures } from './buildZoneFeatures';
import { HIGHLIGHT_COLOR, ZONE_COLORS } from './ZoneStyle';

type MapFilter = React.ComponentProps<typeof FillLayer>['filter'];
type FillStyle = NonNullable<React.ComponentProps<typeof FillLayer>['style']>;
type LineStyle = NonNullable<React.ComponentProps<typeof LineLayer>['style']>;
type CircleStyle = NonNullable<React.ComponentProps<typeof CircleLayer>['style']>;
type ShapePressEvent = Parameters<
  NonNullable<React.ComponentProps<typeof ShapeSource>['onPress']>
>[0];

/** Geometry-type filters — base layers (rule: never feed LineString into Fill). */
const FILL_FILTER: MapFilter = [
  'match',
  ['geometry-type'],
  'Polygon',
  true,
  'MultiPolygon',
  true,
  false,
];

const LINE_FILTER: MapFilter = [
  'match',
  ['geometry-type'],
  'LineString',
  true,
  'MultiLineString',
  true,
  false,
];

const POINT_FILTER: MapFilter = [
  'match',
  ['geometry-type'],
  'Point',
  true,
  'MultiPoint',
  true,
  false,
];

const fillStyle: FillStyle = {
  fillColor: [
    'match',
    ['get', ZoneProps.type],
    'ROAD_CLOSURE',
    ZONE_COLORS.ROAD_CLOSURE,
    'TRAFFIC_EVENT',
    ZONE_COLORS.TRAFFIC_EVENT,
    'SCHOOL_ZONE',
    ZONE_COLORS.SCHOOL_ZONE,
    ZONE_COLORS.ROAD_CLOSURE,
  ],
  fillOpacity: 0.35,
  fillOutlineColor: [
    'match',
    ['get', ZoneProps.type],
    'ROAD_CLOSURE',
    ZONE_COLORS.ROAD_CLOSURE,
    'TRAFFIC_EVENT',
    ZONE_COLORS.TRAFFIC_EVENT,
    'SCHOOL_ZONE',
    ZONE_COLORS.SCHOOL_ZONE,
    ZONE_COLORS.ROAD_CLOSURE,
  ],
};

const lineStyle: LineStyle = {
  lineColor: [
    'match',
    ['get', ZoneProps.type],
    'ROAD_CLOSURE',
    ZONE_COLORS.ROAD_CLOSURE,
    'TRAFFIC_EVENT',
    ZONE_COLORS.TRAFFIC_EVENT,
    ZONE_COLORS.ROAD_CLOSURE,
  ],
  lineWidth: 3,
  lineOpacity: 0.9,
};

const circleStyle: CircleStyle = {
  circleColor: [
    'match',
    ['get', ZoneProps.type],
    'ROAD_CLOSURE',
    ZONE_COLORS.ROAD_CLOSURE,
    'TRAFFIC_EVENT',
    ZONE_COLORS.TRAFFIC_EVENT,
    'SCHOOL_ZONE',
    ZONE_COLORS.SCHOOL_ZONE,
    ZONE_COLORS.SCHOOL_ZONE,
  ],
  circleOpacity: 0.45,
  circleRadius: [
    'match',
    ['get', ZoneProps.type],
    'SCHOOL_ZONE',
    18,
    8,
  ],
  circleStrokeWidth: 1.5,
  circleStrokeColor: [
    'match',
    ['get', ZoneProps.type],
    'ROAD_CLOSURE',
    ZONE_COLORS.ROAD_CLOSURE,
    'TRAFFIC_EVENT',
    ZONE_COLORS.TRAFFIC_EVENT,
    'SCHOOL_ZONE',
    ZONE_COLORS.SCHOOL_ZONE,
    ZONE_COLORS.SCHOOL_ZONE,
  ],
};

const highlightFillStyle: FillStyle = {
  fillColor: HIGHLIGHT_COLOR,
  fillOpacity: 0.25,
  fillOutlineColor: HIGHLIGHT_COLOR,
};

const highlightLineStyle: LineStyle = {
  lineColor: HIGHLIGHT_COLOR,
  lineWidth: 5,
  lineOpacity: 1,
};

const highlightCircleStyle: CircleStyle = {
  circleColor: HIGHLIGHT_COLOR,
  circleOpacity: 0.35,
  circleRadius: 22,
  circleStrokeWidth: 3,
  circleStrokeColor: HIGHLIGHT_COLOR,
};

/**
 * Zone GeoJSON source + Fill / Line / Circle layers.
 *
 * Rule 1: `shape` is memoized on `zones` only — selection does not rebuild it.
 * Rule 2: selection uses filtered highlight layers (not feature-state).
 * Rule 3: this component is a MapView child; overlays stay as siblings outside.
 * Rule 5: granular store selectors (`useZones`, `useSelectedZoneId`).
 * Rule 6: `buildZoneFeatures` emits Points for schools / exploded MultiPoints.
 */
function ZoneLayersComponent() {
  const zones = useZones();
  const selectedZoneId = useSelectedZoneId();
  const selectZone = useMapStore((s) => s.selectZone);

  // Rule 1: features identity tracks zones only.
  const features = useMemo(
    () => buildZoneFeatures(zones ?? []),
    [zones],
  );

  const onPress = useCallback(
    (event: ShapePressEvent) => {
      const feature = event.features[0];
      const id = feature?.properties?.[ZoneProps.id];
      if (typeof id === 'string' && id.length > 0) {
        selectZone(id);
      }
    },
    [selectZone],
  );

  // Rule 2: highlight filter changes with selection; source shape does not.
  // Always mount highlight layers so ShapeSource children stay stable element trees.
  const highlightIdFilter: MapFilter = [
    '==',
    ['get', ZoneProps.id],
    selectedZoneId ?? '__none__',
  ];

  return (
    <ShapeSource id={SRC_ZONES} shape={features} onPress={onPress} hitbox={{ width: 44, height: 44 }}>
      <FillLayer id={LAYER_FILL} filter={FILL_FILTER} style={fillStyle} />
      <LineLayer id={LAYER_LINE} filter={LINE_FILTER} style={lineStyle} />
      <CircleLayer id={LAYER_CIRCLE} filter={POINT_FILTER} style={circleStyle} />

      <FillLayer
        id={LAYER_FILL_HIGHLIGHT}
        filter={['all', FILL_FILTER, highlightIdFilter] as MapFilter}
        style={highlightFillStyle}
      />
      <LineLayer
        id={LAYER_LINE_HIGHLIGHT}
        filter={['all', LINE_FILTER, highlightIdFilter] as MapFilter}
        style={highlightLineStyle}
      />
      <CircleLayer
        id={LAYER_CIRCLE_HIGHLIGHT}
        filter={['all', POINT_FILTER, highlightIdFilter] as MapFilter}
        style={highlightCircleStyle}
      />
    </ShapeSource>
  );
}

export const ZoneLayers = memo(ZoneLayersComponent);
