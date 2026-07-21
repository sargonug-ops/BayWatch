# Bay-Watch

Hyper-local SF situational-awareness MVP. Products in this repo:

- `backend/` — Node.js proxy that normalizes 511 feeds into a single `MapState` (`GET /api/v1/state`).
- `mobile/` — Expo / React Native + Mapbox client (preferred).
- `android/` — Legacy Kotlin + Jetpack Compose + Mapbox scaffold.

See `README.md` and `docs/MVP.md` for product scope and the API contract.

## Cursor Cloud specific instructions

### Backend (`backend/`) — primary runnable service
- Node.js ESM, requires Node >=20. Depends on `gtfs-realtime-bindings` for protobuf transit alerts — run `npm install` in `backend/`.
- Scripts: `npm run dev`, `npm start`, `npm run validate:511` (live smoke test; needs `FIVE11_API_KEY`).
- Endpoints: `GET /health` and `GET /api/v1/state`.
- **Demo mode:** when `FIVE11_API_KEY` is unset (or left as the placeholder), the server serves bundled demo `MapState`. Live mode uses retries + `lastKnownGoodState` stale-while-revalidate (`isDegraded: true` on fallback).
- Gotcha: school-zone entries only appear during PT weekday windows (07:30–08:30 and 14:30–15:30, `America/Los_Angeles`). Outside those windows `schoolZonesActive` is `false` — expected (logic in `src/geo.js`).
- Env: prefer exporting `FIVE11_API_KEY` (Cloud secrets) or `node --env-file=.env` — the process reads `process.env` only (no dotenv import yet).

### Mobile (`mobile/`) — Expo client
- Expo SDK 57 + TypeScript + `@rnmapbox/maps` + Zustand. Needs a **dev build** (not Expo Go) for Mapbox.
- `cd mobile && cp .env.example .env` then set `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` and `EXPO_PUBLIC_BAYWATCH_API_BASE_URL`.
- `npm run typecheck` for `tsc --noEmit`.

### Android (`android/`) — legacy scaffold
- Prefer the Expo client for new work. `android/gradlew` is a placeholder — builds need system Gradle 8.11.1 + JDK 17–21 + Android SDK 35.
