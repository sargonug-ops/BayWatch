# Bay-Watch MVP specification

## Product decisions (locked)

- **Region:** San Francisco only for v0.1; design data layer for multi-city later.
- **Platform:** Android native (Kotlin + Jetpack Compose + Google Maps).
- **Refresh:** Server cache TTL = 5 minutes; client polls on the same interval while foregrounded.
- **Accounts / premium / push:** deferred.

## Data feeds

### 511 WZDx — primary closure geometry

- Endpoint: `https://api.511.org/traffic/wzdx?api_key=…`
- Use GeoJSON `geometry` from each work zone feature.
- Filter features whose geometry intersects the SF viewport bbox.

### 511 Traffic events — highway incidents

- Endpoint: `https://api.511.org/traffic/events?api_key=…`
- Prefer supplied closure geometry; fall back to event point with small buffer only when necessary.

### 511 Transit service alerts

- Endpoint: `https://api.511.org/transit/servicealerts?api_key=…&agency=RG`
- Filter alerts mentioning SF operators (SFMTA, BART in SF, Golden Gate, etc.).
- Surface in a bottom sheet; no polygon unless we geocode route text later.

### Schools (casual)

- Static bundle: public SFUSD campuses from DataSF.
- Activation: weekday + default morning/afternoon windows (see README).
- Visual: semi-transparent yellow circle (~150 m).
- UI copy: "Approximate school zone — times are estimated."

## API contract (`GET /api/v1/state`)

```json
{
  "refreshedAt": "2026-07-16T20:00:00.000Z",
  "zonesVersion": "a1b2c3… (sha256 of sorted zone content)",
  "bbox": { "south": 37.70, "west": -122.52, "north": 37.84, "east": -122.35 },
  "zones": [
    {
      "id": "wzdx-abc123",
      "type": "ROAD_CLOSURE",
      "title": "Market St construction",
      "summary": "Lane closure between 5th and 6th",
      "severity": 3,
      "geometry": { "type": "Polygon", "coordinates": [] },
      "source": "511-wzdx",
      "activeUntil": "2026-07-17T06:00:00.000Z"
    }
  ],
  "transitAlerts": [
    {
      "id": "alert-xyz",
      "agency": "SFMTA",
      "header": "N Judah delay",
      "description": "…",
      "severity": 2
    }
  ],
  "schoolZonesActive": true
}
```

`zonesVersion` is a SHA-256 hex digest of the zone array content. Clients compare it across polls and skip ShapeSource updates when it is unchanged (even if `refreshedAt` advances).
## Open questions (post-MVP)

1. **Blast-radius inference** for incidents without official geometry (crowdsource vs. rules engine).
2. **Per-school bell schedules** — scrape SFUSD PDFs vs. community-maintained dataset.
3. **Privacy model** for future geofencing (on-device vs. server-side geofence registry).
4. **Premium tier** features (historical replay, custom alert radii, saved places).
