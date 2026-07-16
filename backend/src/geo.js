import { SF_BBOX } from "./config.js";

/** @param {import('geojson').Position} coord [lng, lat] */
export function isInSfBbox(coord) {
  const [lng, lat] = coord;
  return (
    lat >= SF_BBOX.south &&
    lat <= SF_BBOX.north &&
    lng >= SF_BBOX.west &&
    lng <= SF_BBOX.east
  );
}

/**
 * @param {import('geojson').Geometry | null | undefined} geometry
 * @returns {boolean}
 */
export function geometryIntersectsSf(geometry) {
  if (!geometry) return false;

  const coords = [];
  switch (geometry.type) {
    case "Point":
      coords.push(geometry.coordinates);
      break;
    case "MultiPoint":
    case "LineString":
      coords.push(...geometry.coordinates);
      break;
    case "MultiLineString":
    case "Polygon":
      geometry.coordinates.forEach((ring) => coords.push(...ring));
      break;
    case "MultiPolygon":
      geometry.coordinates.forEach((poly) =>
        poly.forEach((ring) => coords.push(...ring))
      );
      break;
    default:
      return false;
  }

  return coords.some(isInSfBbox);
}

/**
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusMeters
 * @param {number} [steps]
 * @returns {import('geojson').Polygon}
 */
export function circlePolygon(lat, lng, radiusMeters, steps = 32) {
  const coordinates = [];
  const earthRadius = 6_371_000;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const angular = radiusMeters / earthRadius;

  for (let i = 0; i <= steps; i += 1) {
    const bearing = (2 * Math.PI * i) / steps;
    const latPoint = Math.asin(
      Math.sin(latRad) * Math.cos(angular) +
        Math.cos(latRad) * Math.sin(angular) * Math.cos(bearing)
    );
    const lngPoint =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angular) * Math.cos(latRad),
        Math.cos(angular) - Math.sin(latRad) * Math.sin(latPoint)
      );
    coordinates.push([(lngPoint * 180) / Math.PI, (latPoint * 180) / Math.PI]);
  }

  return { type: "Polygon", coordinates: [coordinates] };
}

/**
 * Weekday default school windows in America/Los_Angeles.
 * @param {Date} [now]
 */
export function isSchoolZoneWindowActive(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const minutes = hour * 60 + minute;

  if (["Sat", "Sun"].includes(weekday)) return false;

  const morning = minutes >= 7 * 60 + 30 && minutes < 8 * 60 + 30;
  const afternoon = minutes >= 14 * 60 + 30 && minutes < 15 * 60 + 30;
  return morning || afternoon;
}
