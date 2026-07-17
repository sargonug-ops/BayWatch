import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import {
  FIVE11_BASE,
  SF_TRANSIT_AGENCIES,
  SF_TRANSIT_AGENCY_CODES,
} from "./config.js";
import { geometryIntersectsSf, circlePolygon, isSchoolZoneWindowActive } from "./geo.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schoolsPath = join(__dirname, "../data/schools_sf.json");

/** @type {{ version: number, schools: Array<{ id: string, name: string, lat: number, lng: number }> }} */
const schoolsBundle = JSON.parse(readFileSync(schoolsPath, "utf8"));

/**
 * Parse 511 JSON responses, stripping a leading UTF-8 BOM when present.
 * @param {Response} response
 */
async function parse511Json(response) {
  const text = await response.text();
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

/**
 * Drop GeoJSON CRS objects that some Mapbox consumers reject.
 * @param {unknown} geometry
 */
function normalizeGeometry(geometry) {
  if (!geometry || typeof geometry !== "object") return geometry;
  const { crs: _crs, ...rest } = /** @type {Record<string, unknown>} */ (geometry);
  return rest;
}

/**
 * @param {string} apiKey
 * @param {string} path
 */
async function fetch511(apiKey, path) {
  const url = `${FIVE11_BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${apiKey}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`511 ${path} failed: ${response.status} ${body.slice(0, 200)}`);
  }
  return parse511Json(response);
}

/**
 * @param {unknown} wzdx
 * @returns {Array<Record<string, unknown>>}
 */
export function mapWzdxZones(wzdx) {
  const features = wzdx?.features ?? wzdx?.road_events ?? [];
  if (!Array.isArray(features)) return [];

  return features
    .map((feature, index) => {
      const geometry = normalizeGeometry(
        feature.geometry ?? feature.core_details?.location?.shape
      );
      if (!geometryIntersectsSf(geometry)) return null;

      const props = feature.properties ?? feature;
      const core = props.core_details ?? {};
      const id = feature.id ?? props.id ?? props.work_zone_id ?? `wzdx-${index}`;
      const roadNames = core.road_names ?? props.road_names;
      return {
        id: String(id),
        type: "ROAD_CLOSURE",
        title: Array.isArray(roadNames)
          ? roadNames.join(" & ")
          : (props.name ?? core.name ?? "Road closure"),
        summary:
          core.description ??
          props.description ??
          props.event_status ??
          core.event_type ??
          props.vehicle_impact ??
          "Active work zone",
        severity: Number(props.severity ?? core.severity ?? 2) || 2,
        geometry,
        source: "511-wzdx",
        activeUntil: props.end_date ?? props.end_time ?? null,
      };
    })
    .filter(Boolean);
}

/**
 * @param {unknown} eventsPayload
 * @returns {Array<Record<string, unknown>>}
 */
export function mapTrafficEvents(eventsPayload) {
  const events = eventsPayload?.events ?? eventsPayload ?? [];
  if (!Array.isArray(events)) return [];

  return events
    .map((event, index) => {
      const rawGeometry =
        event.geography ??
        event.closure_geometry ??
        event.geo?.geometry ??
        (event.latitude && event.longitude
          ? {
              type: "Point",
              coordinates: [Number(event.longitude), Number(event.latitude)],
            }
          : null);

      const geometry = normalizeGeometry(rawGeometry);
      if (!geometryIntersectsSf(geometry)) return null;

      let zoneGeometry = geometry;
      if (geometry?.type === "Point") {
        const [lng, lat] = geometry.coordinates;
        zoneGeometry = circlePolygon(lat, lng, 120);
      }

      const severityRaw = event.severity ?? event.priority ?? 2;
      const severity =
        typeof severityRaw === "number"
          ? severityRaw
          : Number.parseInt(String(severityRaw), 10) || 2;

      return {
        id: String(event.id ?? event.event_id ?? `event-${index}`),
        type: "TRAFFIC_EVENT",
        title: event.event_type ?? event.type ?? "Traffic event",
        summary:
          event.headline ?? event.description ?? event.location ?? "Highway incident",
        severity,
        geometry: zoneGeometry,
        source: "511-traffic-events",
        activeUntil: event.end_date ?? event.end_time ?? null,
      };
    })
    .filter(Boolean);
}

/**
 * @param {string} apiKey
 */
export async function fetchTransitAlerts(apiKey) {
  const url = `${FIVE11_BASE}/transit/servicealerts?api_key=${apiKey}&agency=RG`;
  const response = await fetch(url, {
    headers: { Accept: "application/x-protobuf, application/json" },
  });
  if (!response.ok) {
    return [];
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("json")) {
    const json = await parse511Json(response);
    return mapTransitAlertsJson(json);
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
  return mapTransitAlertsProtobuf(feed);
}

/**
 * @param {unknown} json
 */
export function mapTransitAlertsJson(json) {
  const entities = json?.entity ?? json?.entities ?? [];
  if (!Array.isArray(entities)) return [];
  return entities.map(mapAlertEntity).filter(Boolean);
}

/**
 * @param {{ entity?: Array<unknown> }} feed
 */
export function mapTransitAlertsProtobuf(feed) {
  const entities = feed?.entity ?? [];
  if (!Array.isArray(entities)) return [];
  return entities.map(mapAlertEntity).filter(Boolean);
}

/**
 * @param {unknown} entity
 * @param {number} index
 */
function mapAlertEntity(entity, index) {
  const alert = entity?.alert ?? entity?.service_alert;
  if (!alert) return null;

  const header = translatedText(alert.header_text ?? alert.headerText) ?? "Transit alert";
  const description =
    translatedText(alert.description_text ?? alert.descriptionText) ?? "";

  const agency =
    resolveAgencyFromInformed(alert.informed_entity ?? alert.informedEntity) ??
    entity.agency_id ??
    alert.agency_id ??
    inferAgency(`${header} ${description}`);

  if (!isSfRelevantAlert(agency, header, description)) {
    return null;
  }

  return {
    id: String(entity.id ?? `alert-${index}`),
    agency: agency ?? "Regional",
    header,
    description,
    severity: Number(alert.severity ?? 2) || 2,
  };
}

/** @param {unknown} field */
function translatedText(field) {
  const translations = field?.translation;
  if (!Array.isArray(translations) || translations.length === 0) return null;
  return translations[0]?.text ?? null;
}

/** @param {unknown} informed */
function resolveAgencyFromInformed(informed) {
  if (!Array.isArray(informed)) return null;
  for (const selector of informed) {
    const code = selector?.agency_id ?? selector?.agencyId;
    if (!code) continue;
    const mapped = SF_TRANSIT_AGENCY_CODES.get(String(code).toUpperCase());
    if (mapped) return mapped;
  }
  return null;
}

/**
 * @param {string | null} agency
 * @param {string} header
 * @param {string} description
 */
function isSfRelevantAlert(agency, header, description) {
  if (agency && SF_TRANSIT_AGENCIES.has(agency.toUpperCase())) return true;

  const blob = `${header} ${description}`.toLowerCase();
  const sfKeywords = [
    "san francisco",
    "sfmta",
    "muni",
    "bart",
    "caltrain",
    "golden gate",
    "samtrans",
  ];
  return sfKeywords.some((k) => blob.includes(k));
}

/** @param {string} text */
function inferAgency(text) {
  const upper = text.toUpperCase();
  for (const agency of SF_TRANSIT_AGENCIES) {
    if (upper.includes(agency)) return agency;
  }
  if (upper.includes("MUNI")) return "SFMTA";
  if (upper.includes("BART")) return "BART";
  return null;
}

/** @returns {Array<Record<string, unknown>>} */
export function mapSchoolZones() {
  if (!isSchoolZoneWindowActive()) return [];

  return schoolsBundle.schools.map((school) => ({
    id: `school-${school.id}`,
    type: "SCHOOL_ZONE",
    title: school.name,
    summary: "Approximate school zone — drop-off / pickup window (estimated)",
    severity: 1,
    geometry: circlePolygon(school.lat, school.lng, 150),
    source: "datasf-schools",
    activeUntil: null,
  }));
}

/**
 * @param {string} apiKey
 */
export async function buildMapState(apiKey) {
  const [wzdx, events, transitAlerts] = await Promise.all([
    fetch511(apiKey, "/traffic/wzdx?includeAllDefinedEnums=true").catch(() => ({})),
    fetch511(apiKey, "/traffic/events").catch(() => ({})),
    fetchTransitAlerts(apiKey).catch(() => []),
  ]);

  const zones = [
    ...mapWzdxZones(wzdx),
    ...mapTrafficEvents(events),
    ...mapSchoolZones(),
  ];

  return {
    refreshedAt: new Date().toISOString(),
    bbox: {
      south: 37.708,
      west: -122.515,
      north: 37.833,
      east: -122.357,
    },
    zones,
    transitAlerts,
    schoolZonesActive: isSchoolZoneWindowActive(),
    demo: false,
  };
}

export { schoolsBundle, isSchoolZoneWindowActive, fetch511, parse511Json };
