import type { MapState } from '../models/mapState';

const DEFAULT_BASE_URL = 'http://localhost:3000';

function apiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_BAYWATCH_API_BASE_URL ?? DEFAULT_BASE_URL;
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

export async function getMapState(): Promise<MapState> {
  const response = await fetch(`${apiBaseUrl()}/api/v1/state`);
  if (!response.ok) {
    throw new Error(`Bay-Watch API ${response.status}`);
  }
  return (await response.json()) as MapState;
}
