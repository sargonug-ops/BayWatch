import { create } from 'zustand';

import type { DataSource, MapState, Zone } from '../data/models/mapState';
import { fetchMapState } from '../data/repository/zoneRepository';
import { REFRESH_INTERVAL_MS } from '../map/constants';

type MapStore = {
  mapState: MapState | null;
  isLoading: boolean;
  errorMessage: string | null;
  source: DataSource;
  selectedZoneId: string | null;

  refresh: () => Promise<void>;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
  selectZone: (id: string | null) => void;
};

let refreshTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Map UI store.
 *
 * Rule 5: consumers must use granular selectors (see helpers below), never
 * `useMapStore()` without a selector — that re-renders on every field change.
 *
 * Rule 1: the ShapeSource only depends on `mapState.zones`. Selection lives in
 * `selectedZoneId` and must not rebuild features (rule 2 uses a highlight filter).
 *
 * Skip logic compares `zonesVersion` (content hash), not `refreshedAt` — the
 * backend advances refreshedAt on every cache rebuild even when zones are identical.
 */
export const useMapStore = create<MapStore>((set, get) => ({
  mapState: null,
  isLoading: true,
  errorMessage: null,
  source: 'unknown',
  selectedZoneId: null,

  selectZone: (id) => {
    set({ selectedZoneId: id });
  },

  refresh: async () => {
    const isInitial = get().mapState === null;
    if (isInitial) {
      set({ isLoading: true, errorMessage: null });
    } else {
      set({ errorMessage: null });
    }

    try {
      const next = await fetchMapState();
      const prev = get().mapState;

      // Content-hash skip: keep zones referentially stable so ShapeSource does
      // not re-upload. Still refresh metadata / transitAlerts when present.
      if (prev && prev.zonesVersion && prev.zonesVersion === next.zonesVersion) {
        set({
          mapState: {
            ...next,
            zones: prev.zones,
          },
          isLoading: false,
          source: deriveSource(next, false),
        });
        return;
      }

      set({
        mapState: next,
        isLoading: false,
        source: deriveSource(next, false),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load map state';
      set({
        isLoading: false,
        errorMessage: message,
        source: get().mapState ? get().source : 'offline',
      });
    }
  },

  startAutoRefresh: () => {
    if (refreshTimer) return;
    void get().refresh();
    refreshTimer = setInterval(() => {
      void get().refresh();
    }, REFRESH_INTERVAL_MS);
  },

  stopAutoRefresh: () => {
    if (!refreshTimer) return;
    clearInterval(refreshTimer);
    refreshTimer = null;
  },
}));

function deriveSource(state: MapState, offline: boolean): DataSource {
  if (offline) return 'offline';
  if (state.demo) return 'demo';
  return 'live';
}

// --- Granular selectors (rule 5) -------------------------------------------

/** Rule 1: only subscription the zone source should use. */
export function useZones(): Zone[] | undefined {
  return useMapStore((s) => s.mapState?.zones);
}

export function useSelectedZoneId(): string | null {
  return useMapStore((s) => s.selectedZoneId);
}

export function useDataSource(): DataSource {
  return useMapStore((s) => s.source);
}

export function useSelectedZone(): Zone | null {
  return useMapStore((s) => {
    const id = s.selectedZoneId;
    if (!id || !s.mapState) return null;
    return s.mapState.zones.find((z) => z.id === id) ?? null;
  });
}

export function useIsLoading(): boolean {
  return useMapStore((s) => s.isLoading);
}

export function useErrorMessage(): string | null {
  return useMapStore((s) => s.errorMessage);
}
