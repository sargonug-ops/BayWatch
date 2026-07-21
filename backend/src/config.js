/** San Francisco city bounding box (approximate). */
export const SF_BBOX = {
  south: 37.708,
  west: -122.515,
  north: 37.833,
  east: -122.357,
};

export const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS ?? 300_000);

export const FIVE11_BASE = "https://api.511.org";

export const SF_TRANSIT_AGENCIES = new Set([
  "SFMTA",
  "BART",
  "GOLDEN GATE TRANSIT",
  "GOLDEN GATE FERRY",
  "AC TRANSIT",
  "SAMTRANS",
  "CALTRAIN",
]);
