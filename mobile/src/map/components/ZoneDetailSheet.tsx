import React, { memo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useMapStore, useSelectedZone } from '../../state/mapStore';

/**
 * Rule 3: sibling of MapView. Subscribes only to selected zone (rule 5).
 */
function ZoneDetailSheetComponent() {
  const zone = useSelectedZone();
  const selectZone = useMapStore((s) => s.selectZone);

  if (!zone) return null;

  return (
    <Modal
      transparent
      animationType="slide"
      visible
      onRequestClose={() => selectZone(null)}
    >
      <Pressable style={styles.backdrop} onPress={() => selectZone(null)} />
      <View style={styles.sheet}>
        <Text style={styles.type}>{zone.type.replace(/_/g, ' ')}</Text>
        <Text style={styles.title}>{zone.title}</Text>
        <Text style={styles.summary}>{zone.summary}</Text>
        <Text style={styles.meta}>
          {zone.source}
          {zone.activeUntil ? ` · until ${zone.activeUntil}` : ''}
          {` · severity ${zone.severity}`}
        </Text>
        <Pressable style={styles.close} onPress={() => selectZone(null)}>
          <Text style={styles.closeLabel}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  sheet: {
    backgroundColor: '#111',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 6,
  },
  type: {
    color: '#FF8C42',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  summary: {
    color: '#ddd',
    fontSize: 15,
    lineHeight: 21,
  },
  meta: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  close: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  closeLabel: {
    color: '#fff',
    fontWeight: '600',
  },
});

export const ZoneDetailSheet = memo(ZoneDetailSheetComponent);
