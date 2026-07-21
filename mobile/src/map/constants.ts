/** Mapbox source / layer ids and camera defaults. */

export const SRC_ZONES = 'baywatch-zones';

export const LAYER_FILL = 'zones-fill';
export const LAYER_LINE = 'zones-line';
export const LAYER_CIRCLE = 'zones-circle';

/** Selection highlight layers (filter by selected zone id — rule 2). */
export const LAYER_FILL_HIGHLIGHT = 'zones-fill-highlight';
export const LAYER_LINE_HIGHLIGHT = 'zones-line-highlight';
export const LAYER_CIRCLE_HIGHLIGHT = 'zones-circle-highlight';

/** San Francisco Civic Center-ish default. [lng, lat] */
export const SF_CENTER: [number, number] = [-122.4194, 37.7749];

export const DEFAULT_ZOOM = 12;

export const SCHOOL_ZONE_RADIUS_METERS = 150;

export const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
