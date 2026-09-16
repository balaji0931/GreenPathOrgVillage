/**
 * GreenPath Village Manager Mobile — Map Screen: Layer Picker & Roads Toggle
 *
 * Controls:
 * - Roads network overlay switch toggle
 * - Radio-style cards for selecting active map layer:
 *   1. Collection Status (household dots)
 *   2. Ward Coverage (ward polygon fill % collected)
 *   3. Segregation Quality (ward polygon fill average stars)
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import type { MapLayerType } from '../../../types/manager';

interface MapLayerOption {
  id: MapLayerType;
  label: string;
  desc: string;
}

const LAYERS: MapLayerOption[] = [
  {
    id: 'collection-status',
    label: 'Collection Status',
    desc: 'Household dots — collected vs not collected',
  },
  {
    id: 'ward-coverage',
    label: 'Ward Coverage',
    desc: 'Ward fill — % of households collected',
  },
  {
    id: 'segregation-quality',
    label: 'Segregation Quality',
    desc: 'Ward fill — average segregation score',
  },
];

interface MapLayerPickerProps {
  activeLayer: MapLayerType;
  onSelectLayer: (layer: MapLayerType) => void;
  showRoads: boolean;
  onToggleRoads: () => void;
}

export function MapLayerPicker({
  activeLayer,
  onSelectLayer,
  showRoads,
  onToggleRoads,
}: MapLayerPickerProps) {
  return (
    <View style={styles.container}>
      {/* Roads Overlay Toggle */}
      <View style={styles.roadsCard}>
        <View style={styles.roadsTextGroup}>
          <Text style={styles.roadsTitle}>Show Roads</Text>
          <Text style={styles.roadsSubtitle}>Road network overlay</Text>
        </View>

        <TouchableOpacity
          style={[styles.switchTrack, showRoads && styles.switchTrackActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleRoads();
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.switchThumb, showRoads && styles.switchThumbActive]} />
        </TouchableOpacity>
      </View>

      {/* Layer Selection Card */}
      <View style={styles.layerCard}>
        <Text style={styles.sectionHeader}>MAP LAYER</Text>

        {LAYERS.map((layer, idx) => {
          const isSelected = activeLayer === layer.id;
          const isLast = idx === LAYERS.length - 1;

          return (
            <TouchableOpacity
              key={layer.id}
              style={[
                styles.layerItem,
                isSelected && styles.layerItemSelected,
                !isLast && styles.layerItemBorder,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelectLayer(layer.id);
              }}
              activeOpacity={0.7}
            >
              {/* Radio Indicator */}
              <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>

              {/* Layer Titles */}
              <View style={styles.layerInfo}>
                <Text style={[styles.layerTitle, isSelected && styles.layerTitleSelected]}>
                  {layer.label}
                </Text>
                <Text style={styles.layerDesc}>{layer.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  roadsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  roadsTextGroup: {
    flex: 1,
  },
  roadsTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  roadsSubtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    marginTop: 1,
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.slate200,
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: Colors.emerald700,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  layerCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  sectionHeader: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    letterSpacing: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
  },
  layerItemSelected: {
    backgroundColor: Colors.emerald50,
  },
  layerItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate50,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.slate300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.emerald700,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.emerald700,
  },
  layerInfo: {
    flex: 1,
  },
  layerTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  layerTitleSelected: {
    color: Colors.emerald700,
  },
  layerDesc: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    marginTop: 1,
  },
});
