# Bay-Watch

Hyper-local situational awareness for San Francisco. Bay-Watch visualizes the geographic footprint of real-time disruptions — road closures, transit alerts, and time-aware school zones — instead of treating the map as a simple A-to-B navigator.

## MVP scope (v0.1)

| In scope | Out of scope (later) |
| --- | --- |
| SF-only map | Oakland / Berkeley |
| 511 WZDx road closures + traffic events | Inferred police/fire blast radiuses |
| Regional GTFS-RT transit service alerts (banner/list) | Push geofencing alerts |
| Casual school zones (bundled SFUSD points + default bell windows) | Per-school scraped schedules |
| 5-minute auto-refresh | Manual pull-to-refresh |
| Android native (foreground) | iOS, driving mode, accounts |

## Architecture

```
┌─────────────────┐     5 min poll      ┌──────────────────┐
│  Expo / RN app  │ ◄────────────────── │  backend proxy   │
│  (@rnmapbox)    │   GET /api/v1/state │  (Node + cache)  │
└─────────────────┘                     └────────┬─────────┘
                                                   │
                     ┌─────────────────────────────┼─────────────────────────────┐
                     │                             │                             │
              511 WZDx API                  511 Traffic Events           511 Service Alerts
         (local street closures)            (highway incidents)            (agency=RG)
```

Mobile map rendering uses geometry-typed layers (Fill / Line / Circle) over one
GeoJSON source — see `mobile/src/map/layers/ZoneLayers.tsx`.

**Why a backend proxy?** The 511 API key must not ship inside the Android APK. The proxy normalizes feeds into a single `MapState` payload, caches responses for five minutes (matching the 511 rate limit), and filters geometry to the SF bounding box.

### Blast-radius strategy (MVP)

| Source | Geometry approach | Rationale |
| --- | --- | --- |
| WZDx closures | Official polygons / polylines from feed | Authoritative street-level boundaries |
| Traffic events | Official closure geometry when present; else corridor polyline | Highway incidents already include enhanced geometry |
| Transit alerts | No map polygon — list + map pin at affected route/area text | GTFS-RT alerts rarely include precise polygons |
| School zones | ~150 m circle around campus point during default windows | Casual / approximate; good enough for MVP |

Default school windows (weekdays, `America/Los_Angeles`):

- Morning drop-off: **7:30–8:30**
- Afternoon pickup: **2:30–3:30**

School data is bundled from [DataSF Schools](https://data.sfgov.org/Economy-and-Community/Schools/7e7j-59qk) (public SFUSD sites).

## Getting started

### 1. Backend

```bash
cd backend
cp .env.example .env   # add FIVE11_API_KEY from https://511.org/open-data
npm install
npm run validate:511   # live smoke test against 511 (requires API key)
npm run dev
```

### 2. Mobile (Expo / React Native)

```bash
cd mobile
cp .env.example .env   # Mapbox token + backend URL
npm install
npx expo prebuild      # required — @rnmapbox/maps needs a dev build
npm start
```

See `mobile/README.md` for layer architecture and performance rules.

### 3. Android (legacy Kotlin scaffold)

> Prefer the Expo client above for new work. The Kotlin app under `android/` remains as an earlier prototype.
### Environment variables

| Variable | Where | Description |
| --- | --- | --- |
| `FIVE11_API_KEY` | backend `.env` | Token from [511 Open Data](https://511.org/open-data) |
| `MAPBOX_ACCESS_TOKEN` | `android/local.properties` | Mapbox public token (`pk.…`) for the app |
| `MAPBOX_DOWNLOADS_TOKEN` | `android/local.properties` | Optional secret token (`sk.…`) with `DOWNLOADS:READ` for Gradle |
| `BAYWATCH_API_BASE_URL` | `android/local.properties` | Backend base URL |

## Zone colors (Pulse UI)

| Type | Color | Meaning |
| --- | --- | --- |
| Road closure | Orange `#FF8C42` | Active construction / festival / detour |
| Traffic event | Red `#E63946` | Highway incident or lane closure |
| School zone | Yellow `#FFD166` | Approximate active drop-off / pickup window |
| Transit alert | Blue `#4CC9F0` | Service disruption (list view) |

## License

TBD. 511 data requires attribution to [511.org](https://511.org).
