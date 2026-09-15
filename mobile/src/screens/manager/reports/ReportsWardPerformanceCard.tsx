/**
 * GreenPath Village Manager — Reports Tab: Ward Performance Breakdown Card
 *
 * Implements:
 * - Ward-by-ward collection performance breakdown
 * - Horizontal stacked progress bars (Collected vs Not Collected)
 * - Coverage percentage badges per ward
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import type { ReportWardPerformance } from '../../../types/manager';

interface ReportsWardPerformanceCardProps {
  wardPerformance: ReportWardPerformance[];
}

export function ReportsWardPerformanceCard({
  wardPerformance,
}: ReportsWardPerformanceCardProps) {
  const hasWards = wardPerformance && wardPerformance.length > 0;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.cardTitle}>WARD PERFORMANCE BREAKDOWN</Text>
        </View>
        {hasWards && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{wardPerformance.length} Wards</Text>
          </View>
        )}
      </View>

      {!hasWards ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="map-outline" size={28} color={Colors.slate300} />
          <Text style={styles.emptyText}>No ward metrics recorded for this date.</Text>
        </View>
      ) : (
        <View style={styles.wardsList}>
          {wardPerformance.map((ward, idx) => {
            const total = ward.total || 0;
            const collected = ward.collected || 0;
            const nonCollected = ward.nonCollected || 0;
            const collectedPct = total > 0 ? Math.min(100, Math.round((collected / total) * 100)) : 0;
            const nonCollectedPct = total > 0 ? Math.min(100, Math.round((nonCollected / total) * 100)) : 0;

            return (
              <View key={ward.name || idx} style={styles.wardRow}>
                {/* Ward Title & Percent Chip */}
                <View style={styles.wardTitleRow}>
                  <View style={styles.wardNameBadge}>
                    <Text style={styles.wardName}>{ward.name}</Text>
                  </View>
                  <View
                    style={[
                      styles.wardPctChip,
                      collectedPct >= 80 ? styles.wardPctHigh : styles.wardPctLow,
                    ]}
                  >
                    <Text
                      style={[
                        styles.wardPctText,
                        collectedPct >= 80 ? styles.wardPctTextHigh : styles.wardPctTextLow,
                      ]}
                    >
                      {collectedPct}% Done
                    </Text>
                  </View>
                </View>

                {/* Ward Stats Counts */}
                <View style={styles.wardCountsRow}>
                  <Text style={styles.countItem}>
                    Total: <Text style={styles.countNumber}>{total}</Text>
                  </Text>
                  <Text style={[styles.countItem, { color: Colors.emerald700 }]}>
                    Collected: <Text style={styles.countNumber}>{collected}</Text>
                  </Text>
                  <Text style={[styles.countItem, { color: Colors.destructive }]}>
                    Missed: <Text style={styles.countNumber}>{nonCollected}</Text>
                  </Text>
                </View>

                {/* Stacked Bar */}
                <View style={styles.stackedBarTrack}>
                  {collectedPct > 0 && (
                    <View
                      style={[
                        styles.stackedBarCollected,
                        { width: `${collectedPct}%` },
                      ]}
                    />
                  )}
                  {nonCollectedPct > 0 && (
                    <View
                      style={[
                        styles.stackedBarMissed,
                        { width: `${nonCollectedPct}%` },
                      ]}
                    />
                  )}
                </View>
              </View>
            );
          })}

        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.slate200,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.emerald50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate700,
    letterSpacing: 0.8,
  },
  countBadge: {
    backgroundColor: Colors.slate100,
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate600,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  emptyText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
    textAlign: 'center',
  },
  wardsList: {
    gap: Spacing.md,
  },
  wardRow: {
    backgroundColor: Colors.slate50,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  wardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  wardNameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wardName: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  wardPctChip: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  wardPctHigh: {
    backgroundColor: '#dcfce7',
  },
  wardPctLow: {
    backgroundColor: '#fee2e2',
  },
  wardPctText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
  },
  wardPctTextHigh: {
    color: Colors.emerald700,
  },
  wardPctTextLow: {
    color: Colors.destructive,
  },
  wardCountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  countItem: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
  },
  countNumber: {
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate800,
  },
  stackedBarTrack: {
    height: 8,
    backgroundColor: Colors.slate200,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  stackedBarCollected: {
    height: '100%',
    backgroundColor: Colors.emerald600,
  },
  stackedBarMissed: {
    height: '100%',
    backgroundColor: Colors.destructive,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
  },
});
