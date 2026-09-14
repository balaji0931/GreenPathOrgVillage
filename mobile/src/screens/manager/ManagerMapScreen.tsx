/**
 * GreenPath Village Manager — Tab 3: Village GIS Map Screen
 *
 * Full-screen interactive map:
 * - Color-coded household collection status pins (Green, Yellow, Red)
 * - Village road network overlay
 * - Ward polygon boundaries
 * - Conditional on villageData.locationServicesEnabled === true
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { ManagerVillageData } from '../../types/manager';

interface ManagerMapScreenProps {
  villageData: ManagerVillageData | null;
}

export function ManagerMapScreen({ villageData }: ManagerMapScreenProps) {
  return (
    <View style={styles.container}>
      {/* Top Map HUD Banner */}
      <View style={styles.hudBar}>
        <View style={styles.hudLeft}>
          <Text style={styles.hudTitle}>GIS Village Map</Text>
          <Text style={styles.hudSubtitle}>{villageData?.name || 'Village Infrastructure'}</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: Colors.emerald700 }]} />
            <Text style={styles.legendText}>Done</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: Colors.amber600 }]} />
            <Text style={styles.legendText}>Pending</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: Colors.destructive }]} />
            <Text style={styles.legendText}>Missed</Text>
          </View>
        </View>
      </View>

      {/* Map Canvas Placeholder */}
      <View style={styles.canvasContainer}>
        <View style={styles.emptyMapCard}>
          <View style={styles.mapIconBox}>
            <Ionicons name="map-outline" size={40} color="#0891b2" />
          </View>
          <Text style={styles.mapTitle}>Village Map View</Text>
          <Text style={styles.mapDesc}>
            Interactive Slippy/CartoDB map with household geo-pins and road paths will activate in Phase 4.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  hudBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
    ...Shadows.sm,
  },
  hudLeft: {
    flex: 1,
  },
  hudTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  hudSubtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
    marginTop: 1,
  },
  legendRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
  },
  canvasContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyMapCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  mapIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ecfeff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  mapTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    marginBottom: Spacing.xs,
  },
  mapDesc: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    textAlign: 'center',
    lineHeight: 18,
  },
});
