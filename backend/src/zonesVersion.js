import { createHash } from "node:crypto";

/**
 * Stable content fingerprint for the zones array.
 * Used by clients to skip ShapeSource updates when zone data is unchanged
 * even if refreshedAt advances on each cache rebuild.
 *
 * @param {Array<Record<string, unknown>>} zones
 * @returns {string} hex SHA-256 digest
 */
export function hashZones(zones) {
  const normalized = [...zones]
    .map((zone) => ({
      id: zone.id,
      type: zone.type,
      title: zone.title,
      summary: zone.summary,
      severity: zone.severity,
      geometry: zone.geometry,
      source: zone.source,
      activeUntil: zone.activeUntil ?? null,
    }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));

  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}
