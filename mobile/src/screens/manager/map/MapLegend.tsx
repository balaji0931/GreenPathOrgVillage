/**
 * GreenPath Village Manager Mobile — Map Screen: Dynamic Layer Legend
 *
 * Updates dynamically based on active layer:
 * - collection-status: Status dots & GPS count
 * - ward-coverage: % bins & per-ward collection breakdown
 * - segregation-quality: Star bins & per-ward average segregation rating
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import type { MapLayerType } from '../../../types/manager';

interface MapLegendProps {
  activeLayer: MapLayerType;
  totalHouseholds: number;
  householdsWithGps: number;
  wardCoverage: Map<string, { total: number; collected: number }>;
  wardSegregation: Map<string, { sum: number; count: number }>;
  avgRating: string;
  totalRated: number;
}

export function MapLegend({
  activeLayer,
  totalHouseholds,
  householdsWithGps,
  wardCoverage,
  wardSegregation,
  avgRating,
  totalRated,
}: MapLegendProps) {
  if (activeLayer === 'collection-status') {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>LEGEND</Text>

        <View style={styles.legendWrap}>
          <View style={styles.legendItem}>
            <View style={[styles.statusDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.legendLabel}>Collected</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.statusDot, { backgroundColor: '#94a3b8' }]} />
            <Text style={styles.legendLabel}>Pending</Text>
          </View>
        </View>

        <Text style={styles.helperText}>
          {householdsWithGps} of {totalHouseholds} households have GPS coordinates mapped.
        </Text>
      </View>
    );
  }

  if (activeLayer === 'ward-coverage') {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>WARD COVERAGE</Text>

        <View style={styles.thresholdsWrap}>
          {[
            { color: '#16a34a', label: '≥90%' },
            { color: '#ca8a04', label: '60–89%' },
            { color: '#ea580c', label: '30–59%' },
            { color: '#dc2626', label: '<30%' },
          ].map((item) => (
            <View key={item.label} style={styles.thresholdItem}>
              <View style={[styles.thresholdSwatch, { backgroundColor: item.color }]} />
              <Text style={styles.thresholdText}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.breakdownList}>
          {Array.from(wardCoverage.entries()).map(([ward, { total, collected }]) => {
            const pct = total > 0 ? Math.round((collected / total) * 100) : 0;
            const pctColor =
              pct >= 90
                ? '#16a34a'
                : pct >= 60
                ? '#ca8a04'
                : pct >= 30
                ? '#ea580c'
                : '#dc2626';

            return (
              <View key={ward} style={styles.breakdownRow}>
                <Text style={styles.wardNameText} numberOfLines={1}>
                  {ward}
                </Text>
                <Text style={styles.countText}>
                  {collected}/{total}
                </Text>
                <View style={[styles.pctBadge, { backgroundColor: `${pctColor}15` }]}>
                  <Text style={[styles.pctBadgeText, { color: pctColor }]}>{pct}%</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  if (activeLayer === 'segregation-quality') {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>SEGREGATION QUALITY</Text>

        <View style={styles.thresholdsWrap}>
          {[
            { color: '#16a34a', label: 'Avg ≥4 ★' },
            { color: '#ca8a04', label: 'Avg 3–4 ★' },
            { color: '#ea580c', label: 'Avg 2–3 ★' },
            { color: '#dc2626', label: 'Avg <2 ★' },
          ].map((item) => (
            <View key={item.label} style={styles.thresholdItem}>
              <View style={[styles.thresholdSwatch, { backgroundColor: item.color }]} />
              <Text style={styles.thresholdText}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.breakdownList}>
          {Array.from(wardSegregation.entries()).map(([ward, { sum, count }]) => {
            const avg = count > 0 ? (sum / count).toFixed(1) : '—';
            const avgNum = count > 0 ? sum / count : 0;
            const avgColor =
              avgNum >= 4
                ? '#16a34a'
                : avgNum >= 3
                ? '#ca8a04'
                : avgNum >= 2
                ? '#ea580c'
                : '#dc2626';

            return (
              <View key={ward} style={styles.breakdownRow}>
                <Text style={styles.wardNameText} numberOfLines={1}>
                  {ward}
                </Text>
                <Text style={[styles.countText, { color: avgColor, fontFamily: Typography.fontFamilyBold }]}>
                  {avg} ★
                </Text>
                <Text style={styles.ratedCountText}>{count} rated</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.helperText}>
          Village avg: {avgRating} ★ ({totalRated} households rated today)
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.slate100,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  sectionHeader: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    letterSpacing: 1,
  },
  legendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate700,
  },
  thresholdsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  thresholdItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  thresholdSwatch: {
    width: 14,
    height: 10,
    borderRadius: 2,
    opacity: 0.85,
  },
  thresholdText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate700,
  },
  breakdownList: {
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  wardNameText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate700,
  },
  countText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  pctBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  pctBadgeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
  },
  ratedCountText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
  },
  helperText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    lineHeight: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.slate50,
    paddingTop: Spacing.xs,
  },
});
