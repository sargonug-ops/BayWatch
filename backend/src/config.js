/** San Francisco city bounding box (approximate). */
export const SF_BBOX = {
  south: 37.708,
  west: -122.515,
  north: 37.833,
  east: -122.357,
};

export const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS ?? 300_000);

export const FIVE11_BASE = "https://api.511.org";

/** Display names used in the Android UI. */
export const SF_TRANSIT_AGENCIES = new Set([
  "SFMTA",
  "BART",
  "GOLDEN GATE TRANSIT",
  "GOLDEN GATE FERRY",
  "AC TRANSIT",
  "SAMTRANS",
  "CALTRAIN",
]);

/**
 * 511 GTFS agency_id codes we keep for the SF-focused map.
 * @see https://511.org/open-data/transit
 */
export const SF_TRANSIT_AGENCY_CODES = new Map([
  ["SF", "SFMTA"],
  ["BA", "BART"],
  ["GG", "GOLDEN GATE TRANSIT"],
  ["GF", "GOLDEN GATE FERRY"],
  ["AC", "AC TRANSIT"],
  ["SM", "SAMTRANS"],
  ["CT", "CALTRAIN"],
  ["ST", "SAMTRANS"],
]);
