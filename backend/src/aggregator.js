import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { FIVE11_BASE } from "./config.js";
import { geometryIntersectsSf, circlePolygon, isSchoolZoneWindowActive } from "./geo.js";
import { SF_TRANSIT_AGENCIES } from "./config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schoolsPath = join(__dirname, "../data/schools_sf.json");

/** @type {{ version: number, schools: Array<{ id: string, name: string, lat: number, lng: number }> }} */
const schoolsBundle = JSON.parse(readFileSync(schoolsPath, "utf8"));

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
  return response.json();
}

/**
 * @param {unknown} wzdx
 * @returns {Array<Record<string, unknown>>}
 */
function mapWzdxZones(wzdx) {
  const features = wzdx?.features ?? wzdx?.road_events ?? [];
  if (!Array.isArray(features)) return [];

  return features
    .map((feature, index) => {
      const geometry = feature.geometry ?? feature.core_details?.location?.shape;
      if (!geometryIntersectsSf(geometry)) return null;

      const props = feature.properties ?? feature;
      const id = props.id ?? props.work_zone_id ?? `wzdx-${index}`;
      return {
        id: String(id),
        type: "ROAD_CLOSURE",
        title: props.road_names?.join?.(" & ") ?? props.name ?? "Road closure",
        summary:
          props.description ??
          props.event_status ??
          props.vehicle_impact ??
          "Active work zone",
        severity: props.severity ?? 2,
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
function mapTrafficEvents(eventsPayload) {
  const events = eventsPayload?.events ?? eventsPayload ?? [];
  if (!Array.isArray(events)) return [];

  return events
    .map((event, index) => {
      const geometry =
        event.closure_geometry ??
        event.geo?.geometry ??
        (event.latitude && event.longitude
          ? {
              type: "Point",
              coordinates: [Number(event.longitude), Number(event.latitude)],
            }
          : null);

      if (!geometryIntersectsSf(geometry)) return null;

      let zoneGeometry = geometry;
      if (geometry?.type === "Point") {
        const [lng, lat] = geometry.coordinates;
        zoneGeometry = circlePolygon(lat, lng, 120);
      }

      return {
        id: String(event.id ?? event.event_id ?? `event-${index}`),
        type: "TRAFFIC_EVENT",
        title: event.event_type ?? event.type ?? "Traffic event",
        summary: event.description ?? event.location ?? "Highway incident",
        severity: Number(event.severity ?? event.priority ?? 2),
        geometry: zoneGeometry,
        source: "511-traffic-events",
        activeUntil: event.end_date ?? event.end_time ?? null,
      };
    })
    .filter(Boolean);
}

/**
 * Best-effort GTFS-RT alert extraction without full protobuf schema.
 * @param {string} apiKey
 */
async function fetchTransitAlerts(apiKey) {
  const url = `${FIVE11_BASE}/transit/servicealerts?api_key=${apiKey}&agency=RG`;
  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("json")) {
    const json = await response.json();
    return mapTransitAlertsJson(json);
  }

  // Protobuf feed: surface a placeholder until gtfs-realtime-bindings is added.
  return [];
}

/**
 * @param {unknown} json
 */
function mapTransitAlertsJson(json) {
  const entities = json?.entity ?? json?.entities ?? [];
  if (!Array.isArray(entities)) return [];

  return entities
    .map((entity, index) => {
      const alert = entity.alert ?? entity.service_alert;
      if (!alert) return null;

      const header =
        alert.header_text?.translation?.[0]?.text ??
        alert.headerText?.translation?.[0]?.text ??
        "Transit alert";
      const description =
        alert.description_text?.translation?.[0]?.text ??
        alert.descriptionText?.translation?.[0]?.text ??
        "";

      const agency =
        entity.agency_id ??
        alert.agency_id ??
        inferAgency(`${header} ${description}`);

      if (agency && !SF_TRANSIT_AGENCIES.has(agency.toUpperCase())) {
        // Keep SF-relevant alerts by keyword when agency metadata is missing.
        const blob = `${header} ${description}`.toLowerCase();
        const sfKeywords = ["san francisco", "sfmta", "muni", "bart", "caltrain", "ggn"];
        if (!sfKeywords.some((k) => blob.includes(k))) return null;
      }

      return {
        id: String(entity.id ?? `alert-${index}`),
        agency: agency ?? "Regional",
        header,
        description,
        severity: 2,
      };
    })
    .filter(Boolean);
}

/** @param {string} text */
function inferAgency(text) {
  const upper = text.toUpperCase();
  for (const agency of SF_TRANSIT_AGENCIES) {
    if (upper.includes(agency)) return agency;
  }
  if (upper.includes("MUNI")) return "SFMTA";
  return null;
}

/** @returns {Array<Record<string, unknown>>} */
function mapSchoolZones() {
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
  };
}

export { schoolsBundle, isSchoolZoneWindowActive };
