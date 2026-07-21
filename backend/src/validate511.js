#!/usr/bin/env node
/**
 * Live validation against the 511 SF Bay Open Data API.
 *
 * Requires FIVE11_API_KEY in the environment (Cloud Agent secrets or backend/.env).
 * Exits 0 on success, 1 on validation failure.
 */
import { FIVE11_BASE } from "./config.js";
import {
  buildMapState,
  clearLastKnownGoodState,
  fetch511,
  fetchTransitAlerts,
  getLastKnownGoodState,
  mapTrafficEvents,
  mapWzdxZones,
} from "./aggregator.js";

const ZONE_TYPES = new Set(["ROAD_CLOSURE", "TRAFFIC_EVENT", "SCHOOL_ZONE"]);
const GEOMETRY_TYPES = new Set([
  "Point",
  "MultiPoint",
  "LineString",
  "MultiLineString",
  "Polygon",
  "MultiPolygon",
]);

/**
 * @typedef {{ ok: boolean, name: string, detail: string }} Check
 */

/** @type {Check[]} */
const checks = [];

/**
 * @param {string} name
 * @param {boolean} ok
 * @param {string} detail
 */
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`[${mark}] ${name}: ${detail}`);
}

function requireApiKey() {
  const apiKey = process.env.FIVE11_API_KEY;
  if (!apiKey || apiKey === "your_511_api_key_here") {
    check("api_key", false, "FIVE11_API_KEY is missing or still the placeholder value");
    return null;
  }
  check("api_key", true, `present (${apiKey.length} chars)`);
  return apiKey;
}

/**
 * @param {unknown} zone
 * @param {string} label
 */
function assertZoneShape(zone, label) {
  if (!zone || typeof zone !== "object") {
    check(label, false, "zone is not an object");
    return;
  }
  const z = /** @type {Record<string, unknown>} */ (zone);
  const missing = ["id", "type", "title", "summary", "geometry", "source"].filter(
    (key) => z[key] == null || z[key] === ""
  );
  if (missing.length) {
    check(label, false, `missing fields: ${missing.join(", ")}`);
    return;
  }
  if (!ZONE_TYPES.has(String(z.type))) {
    check(label, false, `unexpected type ${z.type}`);
    return;
  }
  const geometry = /** @type {Record<string, unknown>} */ (z.geometry);
  if (!GEOMETRY_TYPES.has(String(geometry.type))) {
    check(label, false, `unexpected geometry type ${geometry.type}`);
    return;
  }
  if (geometry.crs) {
    check(label, false, "geometry still contains crs (should be stripped)");
    return;
  }
  check(label, true, `${z.type} from ${z.source} (${geometry.type})`);
}

/**
 * @param {unknown} alert
 * @param {string} label
 */
function assertAlertShape(alert, label) {
  if (!alert || typeof alert !== "object") {
    check(label, false, "alert is not an object");
    return;
  }
  const a = /** @type {Record<string, unknown>} */ (alert);
  // description may be empty for some alerts; require id/agency/header
  const requiredMissing = ["id", "agency", "header"].filter(
    (key) => a[key] == null || a[key] === ""
  );
  if (requiredMissing.length) {
    check(label, false, `missing fields: ${requiredMissing.join(", ")}`);
    return;
  }
  check(label, true, `${a.agency}: ${String(a.header).slice(0, 60)}`);
}

/**
 * @param {string} apiKey
 */
async function validateUpstream(apiKey) {
  const wzdx = await fetch511(apiKey, "/traffic/wzdx?includeAllDefinedEnums=true");
  check(
    "wzdx_feed",
    Array.isArray(wzdx?.features) && wzdx.features.length > 0,
    `FeatureCollection with ${wzdx?.features?.length ?? 0} features`
  );

  const events = await fetch511(apiKey, "/traffic/events");
  check(
    "traffic_events_feed",
    Array.isArray(events?.events),
    `events[] length ${events?.events?.length ?? 0}`
  );

  const sfWzdx = mapWzdxZones(wzdx);
  check(
    "wzdx_sf_filter",
    sfWzdx.length > 0,
    `${sfWzdx.length} SF-intersecting work zones`
  );
  if (sfWzdx[0]) assertZoneShape(sfWzdx[0], "wzdx_zone_shape");

  const sfEvents = mapTrafficEvents(events);
  check(
    "traffic_events_sf_filter",
    sfEvents.length >= 0,
    `${sfEvents.length} SF-intersecting traffic events`
  );
  if (sfEvents[0]) assertZoneShape(sfEvents[0], "traffic_event_zone_shape");

  const alerts = await fetchTransitAlerts(apiKey);
  check(
    "transit_alerts_protobuf",
    Array.isArray(alerts) && alerts.length > 0,
    `${alerts.length} SF-relevant GTFS-RT alerts decoded`
  );
  if (alerts[0]) assertAlertShape(alerts[0], "transit_alert_shape");
}

/**
 * @param {string} apiKey
 */
async function validateAggregatedState(apiKey) {
  clearLastKnownGoodState();
  const state = await buildMapState(apiKey);
  check("map_state_demo_flag", state.demo === false, `demo=${state.demo}`);
  check(
    "map_state_refreshed_at",
    typeof state.refreshedAt === "string" && !Number.isNaN(Date.parse(state.refreshedAt)),
    state.refreshedAt
  );
  check(
    "map_state_zones_version",
    typeof state.zonesVersion === "string" && state.zonesVersion.length === 64,
    `sha256=${String(state.zonesVersion).slice(0, 12)}…`
  );
  check(
    "map_state_not_degraded",
    state.isDegraded === false,
    `isDegraded=${state.isDegraded}`
  );
  check(
    "last_known_good_cached",
    getLastKnownGoodState() != null && getLastKnownGoodState()?.zonesVersion === state.zonesVersion,
    "lastKnownGoodState updated after successful fetch"
  );

  const liveZones = state.zones.filter(
    (z) => z.source === "511-wzdx" || z.source === "511-traffic-events"
  );
  check(
    "map_state_live_zones",
    liveZones.length > 0,
    `${liveZones.length} live 511 zones (of ${state.zones.length} total)`
  );
  check(
    "map_state_transit_alerts",
    Array.isArray(state.transitAlerts) && state.transitAlerts.length > 0,
    `${state.transitAlerts.length} transit alerts in MapState`
  );

  // Stale-while-revalidate: a hard failure after retries must serve lastKnownGood
  // with isDegraded:true — never an empty zone overwrite.
  const originalFetch = globalThis.fetch;
  const previousAttempts = process.env.FIVE11_RETRY_ATTEMPTS;
  const previousDelay = process.env.FIVE11_RETRY_DELAY_MS;
  process.env.FIVE11_RETRY_ATTEMPTS = "2";
  process.env.FIVE11_RETRY_DELAY_MS = "0";
  globalThis.fetch = async () => {
    throw new Error("forced upstream outage for SWR validation");
  };
  try {
    const degraded = await buildMapState(apiKey);
    check(
      "swr_degraded_flag",
      degraded.isDegraded === true,
      `isDegraded=${degraded.isDegraded}`
    );
    check(
      "swr_preserves_zones",
      Array.isArray(degraded.zones) &&
        degraded.zones.length === state.zones.length &&
        degraded.zonesVersion === state.zonesVersion,
      `zones=${degraded.zones?.length ?? 0} version=${String(degraded.zonesVersion).slice(0, 12)}…`
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (previousAttempts === undefined) delete process.env.FIVE11_RETRY_ATTEMPTS;
    else process.env.FIVE11_RETRY_ATTEMPTS = previousAttempts;
    if (previousDelay === undefined) delete process.env.FIVE11_RETRY_DELAY_MS;
    else process.env.FIVE11_RETRY_DELAY_MS = previousDelay;
  }

  console.log(
    `\n511 base: ${FIVE11_BASE}\nSummary: ${liveZones.length} live zones, ${state.transitAlerts.length} alerts`
  );
}

async function main() {
  console.log("Bay-Watch 511 live validation\n");
  const apiKey = requireApiKey();
  if (!apiKey) {
    process.exitCode = 1;
    return;
  }

  try {
    await validateUpstream(apiKey);
    await validateAggregatedState(apiKey);
  } catch (error) {
    check(
      "uncaught",
      false,
      error instanceof Error ? error.message : String(error)
    );
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

main();
