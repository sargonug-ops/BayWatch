import type { ZoneType } from '../../data/models/mapState';

/**
 * Minimal paint tokens. Rule 4 (hoist/stabilize all style refs) comes later —
 * these module-level objects are already stable across renders.
 */
export const ZONE_COLORS: Record<ZoneType, string> = {
  ROAD_CLOSURE: '#FF8C42',
  TRAFFIC_EVENT: '#E63946',
  SCHOOL_ZONE: '#FFD166',
};

export const HIGHLIGHT_COLOR = '#FFFFFF';
