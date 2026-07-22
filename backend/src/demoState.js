import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { bufferPointMeters, isSchoolZoneWindowActive } from "./geo.js";
import { hashZones } from "./zonesVersion.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schoolsPath = join(__dirname, "../data/schools_sf.json");
const schoolsBundle = JSON.parse(readFileSync(schoolsPath, "utf8"));

/** Demo map state when no 511 API key is configured. */
export function buildDemoState() {
  const schoolZones = isSchoolZoneWindowActive()
    ? schoolsBundle.schools.slice(0, 12).map((school) => ({
        id: `school-${school.id}`,
        type: "SCHOOL_ZONE",
        title: school.name,
        summary: "Approximate school zone — drop-off / pickup window (estimated)",
        severity: 1,
        geometry: bufferPointMeters(school.lat, school.lng, 150),
        source: "datasf-schools",
        activeUntil: null,
      }))
    : [];

  // Sample closure polygon near SoMa for visual testing.
  const demoClosure = {
    id: "demo-closure-soma",
    type: "ROAD_CLOSURE",
    title: "Demo: Howard St work zone",
    summary: "Sample closure for development (replace with live 511 data)",
    severity: 3,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-122.405, 37.778],
          [-122.403, 37.778],
          [-122.403, 37.776],
          [-122.405, 37.776],
          [-122.405, 37.778],
        ],
      ],
    },
    source: "demo",
    activeUntil: null,
  };

  const zones = [...schoolZones, demoClosure];

  return {
    refreshedAt: new Date().toISOString(),
    zonesVersion: hashZones(zones),
    bbox: {
      south: 37.708,
      west: -122.515,
      north: 37.833,
      east: -122.357,
    },
    zones,
    transitAlerts: [
      {
        id: "demo-alert",
        agency: "SFMTA",
        header: "Demo: Muni Metro delay",
        description:
          "Configure FIVE11_API_KEY to load live regional service alerts.",
        severity: 2,
      },
    ],
    schoolZonesActive: isSchoolZoneWindowActive(),
    demo: true,
    isDegraded: false,
  };
}
