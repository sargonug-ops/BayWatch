import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useDataSource, useErrorMessage } from '../../state/mapStore';
import type { DataSource } from '../../data/models/mapState';

/**
 * Rule 3: sibling of MapView — updates here must not re-render the map source.
 */
function ConnectionBannerComponent() {
  const source = useDataSource();
  const errorMessage = useErrorMessage();

  return (
    <View style={[styles.banner, bannerStyle(source)]} pointerEvents="none">
      <Text style={styles.label}>{labelFor(source)}</Text>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </View>
  );
}

function labelFor(source: DataSource): string {
  switch (source) {
    case 'live':
      return 'Live · 511';
    case 'degraded':
      return 'Live · stale cache';
    case 'demo':
      return 'Demo data';
    case 'offline':
      return 'Offline';
    default:
      return 'Connecting…';
  }
}

function bannerStyle(source: DataSource) {
  switch (source) {
    case 'live':
      return styles.live;
    case 'degraded':
      return styles.degraded;
    case 'demo':
      return styles.demo;
    case 'offline':
      return styles.offline;
    default:
      return styles.unknown;
  }
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 2,
  },
  label: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
  error: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.9,
    textAlign: 'center',
  },
  live: { backgroundColor: 'rgba(46, 125, 50, 0.92)' },
  degraded: { backgroundColor: 'rgba(183, 110, 0, 0.92)' },
  demo: { backgroundColor: 'rgba(245, 124, 0, 0.92)' },
  offline: { backgroundColor: 'rgba(198, 40, 40, 0.92)' },
  unknown: { backgroundColor: 'rgba(66, 66, 66, 0.85)' },
});

export const ConnectionBanner = memo(ConnectionBannerComponent);
