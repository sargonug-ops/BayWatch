# Bay-Watch mobile (Expo + React Native)

Cross-platform client for the Bay-Watch backend proxy. Renders 511 WZDx /
traffic / school zones with geometry-correct Mapbox layers (Fill / Line / Circle).

## Requirements

- Node 20+
- Expo SDK 57
- A **dev build** (not Expo Go) — `@rnmapbox/maps` needs custom native code
- Mapbox public token + downloads token
- Backend running with `FIVE11_API_KEY` for live data

## Setup

```bash
cd mobile
cp .env.example .env
# fill EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN + EXPO_PUBLIC_BAYWATCH_API_BASE_URL
npm install
npx expo prebuild   # first time / after native dep changes
npm start
```

## Architecture notes

Performance rules baked into `ZoneLayers` + `mapStore`:

1. `ShapeSource` shape depends only on `zones` (memoized)
2. Selection uses filtered highlight layers (not feature-state, not feature rebuild)
3. Overlays (`ConnectionBanner`, `ZoneDetailSheet`) are MapView siblings
5. Granular Zustand selectors (`useZones`, `useSelectedZoneId`, …)
6. `buildZoneFeatures` is pure; school zones → Point + CircleLayer

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Expo dev server |
| `npm run typecheck` | `tsc --noEmit` |
