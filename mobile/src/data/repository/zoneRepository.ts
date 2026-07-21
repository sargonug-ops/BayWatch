import type { MapState } from '../models/mapState';
import { getMapState } from '../api/bayWatchApi';

/**
 * Fetches live MapState from the backend proxy.
 * Offline fallback (bundled schools) can be layered in later — for the scaffold
 * we surface failures to the store so ConnectionBanner can show OFFLINE.
 */
export async function fetchMapState(): Promise<MapState> {
  return getMapState();
}
