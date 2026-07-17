# Bay-Watch

Hyper-local SF situational-awareness MVP. Two products live in this repo:

- `backend/` — Node.js proxy that normalizes 511 feeds into a single `MapState` (`GET /api/v1/state`).
- `android/` — Kotlin + Jetpack Compose + Mapbox app that renders the zones.

See `README.md` and `docs/MVP.md` for product scope and the API contract.

## Cursor Cloud specific instructions

### Backend (`backend/`) — primary runnable service
- Pure Node.js (ESM, requires Node >=20). It has **no npm dependencies**; `npm install` is effectively a no-op but is kept for convention.
- Run the dev server from `backend/` with `npm run dev` (`node --watch src/index.js`). Endpoints: `GET /health` and `GET /api/v1/state`.
- **Demo mode:** when `FIVE11_API_KEY` is unset (or left as the placeholder in `.env.example`), the server serves a bundled demo `MapState` (a sample road closure + a demo transit alert). No secret is required to run and test the backend. Add a real key to `backend/.env` for live 511 data.
- Gotcha: school-zone entries only appear during PT weekday windows (07:30–08:30 and 14:30–15:30, `America/Los_Angeles`). Outside those windows the `zones` list is sparse and `schoolZonesActive` is `false` — this is expected, not a bug (logic in `src/geo.js`).
- There is no lint or test setup for the backend in this scaffold.

### Android (`android/`) — build toolchain notes
- This is a scaffold. `android/gradlew` is a **placeholder** (`exec gradle "$@"`) — there is no committed wrapper jar, so builds require a system Gradle. Use **Gradle 8.11.1** (matches `gradle/wrapper/gradle-wrapper.properties`) with JDK 17–21 and the Android SDK (`platforms;android-35`, `build-tools;35.0.0`). These are installed in the VM under `~/tools/gradle-8.11.1` and `~/android-sdk` and captured in the snapshot.
- Build from `android/` with `ANDROID_HOME=~/android-sdk` set, e.g. `gradle :app:assembleDebug`.
- `android/local.properties` is gitignored and must exist for builds. Copy `local.properties.example` and set `sdk.dir`, `BAYWATCH_API_BASE_URL` (use `http://10.0.2.2:3000` for an emulator), and `MAPBOX_ACCESS_TOKEN`. Mapbox SDK artifacts currently download anonymously, so leaving `MAPBOX_DOWNLOADS_TOKEN=` (empty) works; do **not** put a placeholder there, because a non-empty invalid token is sent as the Maven password and returns HTTP 401. A real public `pk.` token is only needed to actually render the map at runtime.
- Known issue (pre-existing app code, not environment): `app/src/main/java/com/baywatch/app/ui/map/components/ZonePolygonOverlay.kt` has compile errors (self-assignment of `fillColor`; `.double` called on `JsonElement` instead of `.jsonPrimitive.double`), so `assembleDebug` fails at `compileDebugKotlin`. Everything up to that (dependency resolution incl. Mapbox, resource processing, dexing) succeeds.
- Running the app requires an Android emulator/device plus a valid Mapbox public token; not feasible headless in the cloud VM without those.
