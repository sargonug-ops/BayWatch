import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Mapbox, { Camera, MapView, StyleURL } from '@rnmapbox/maps';

import { ConnectionBanner } from '../src/map/components/ConnectionBanner';
import { ZoneDetailSheet } from '../src/map/components/ZoneDetailSheet';
import { ZoneLayers } from '../src/map/layers';
import { DEFAULT_ZOOM, SF_CENTER } from '../src/map/constants';
import { useMapStore } from '../src/state/mapStore';

const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (mapboxToken) {
  Mapbox.setAccessToken(mapboxToken);
}

/**
 * Main map screen.
 *
 * Rule 3: overlays (banner, detail sheet) are siblings of MapView — their
 * re-renders never touch ShapeSource.
 */
export default function MapScreen() {
  const startAutoRefresh = useMapStore((s) => s.startAutoRefresh);
  const stopAutoRefresh = useMapStore((s) => s.stopAutoRefresh);

  useEffect(() => {
    startAutoRefresh();
    return () => stopAutoRefresh();
  }, [startAutoRefresh, stopAutoRefresh]);

  return (
    <View style={styles.root}>
      <MapView style={styles.map} styleURL={StyleURL.Dark}>
        <Camera centerCoordinate={SF_CENTER} zoomLevel={DEFAULT_ZOOM} />
        <ZoneLayers />
      </MapView>

      {/* Rule 3: siblings — not MapView children */}
      <ConnectionBanner />
      <ZoneDetailSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  map: { flex: 1 },
});
