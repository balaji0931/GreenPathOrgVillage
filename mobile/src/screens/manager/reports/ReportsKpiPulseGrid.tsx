/**
 * GreenPath Village Manager — Reports Tab: KPI Pulse Grid
 *
 * Implements:
 * - Row 1: Total Households & Not Collected side-by-side metric cards
 * - Row 2: Collection Pulse (Collected today, difference vs yesterday, 7-day sparkline micro-bars)
 * - Row 3: Segregation Pulse (Avg rating out of 5.0, 7-day rating sparkline micro-bars)
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import type { ReportKpiData, ReportPulseItem } from '../../../types/manager';

interface ReportsKpiPulseGridProps {
  kpis: ReportKpiData;
  pulses: ReportPulseItem[];
}

export function ReportsKpiPulseGrid({ kpis, pulses }: ReportsKpiPulseGridProps) {
  const collDiff = kpis.collectedToday - kpis.collectedYesterday;
  const isDiffPositive = collDiff >= 0;

  // Max value for collection sparkline scaling
  const maxCollection = Math.max(1, ...pulses.map((p) => p.collections));

  return (
    <View style={styles.container}>
      {/* Row 1: Total Households & Not Collected */}
      <View style={styles.rowTwoCards}>
        {/* Total Households */}
        <View style={styles.kpiSmallCard}>
          <Text style={styles.kpiBigNumber}>{kpis.totalHouseholds}</Text>
          <Text style={styles.kpiLabel}>TOTAL HOUSEHOLDS</Text>
        </View>

        {/* Not Collected */}
        <View style={[styles.kpiSmallCard, styles.kpiCardAlert]}>
          <Text style={[styles.kpiBigNumber, { color: Colors.destructive }]}>
            {kpis.nonCollectedToday}
          </Text>
          <Text style={[styles.kpiLabel, { color: Colors.destructive }]}>
            NOT COLLECTED
          </Text>
        </View>
      </View>

      {/* Row 2: Collection Pulse with 7-Day Sparkline Micro-bars */}
      <View style={styles.pulseCard}>
        <View style={styles.pulseLeft}>
          <Text style={styles.pulseTitle}>COLLECTION PULSE</Text>
          <View style={styles.pulseNumberRow}>
            <Text style={styles.pulseBigValue}>{kpis.collectedToday}</Text>
            <View
              style={[
                styles.diffBadge,
                isDiffPositive ? styles.diffBadgeUp : styles.diffBadgeDown,
              ]}
            >
              <Ionicons
                name={isDiffPositive ? 'arrow-up' : 'arrow-down'}
                size={10}
                color={isDiffPositive ? Colors.emerald700 : Colors.destructive}
              />
              <Text
                style={[
                  styles.diffText,
                  { color: isDiffPositive ? Colors.emerald700 : Colors.destructive },
                ]}
              >
                {Math.abs(collDiff)} vs yesterday
              </Text>
            </View>
          </View>
          <Text style={styles.pulseSub}>Today's completed collections</Text>
        </View>

        {/* 7-Day Sparkline Micro-Bars */}
        <View style={styles.sparklineContainer}>
          <Text style={styles.sparklineLabel}>LAST 7-DAY TREND</Text>
          <View style={styles.barsRow}>
            {pulses.map((item, idx) => {
              const heightPercent = Math.round((item.collections / maxCollection) * 100);
              const isTodayBar = idx === pulses.length - 1;
              return (
                <View key={item.day || idx} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${heightPercent}%` },
                        isTodayBar && styles.barFillToday,
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Row 3: Segregation Pulse with 7-Day Rating Micro-bars */}
      <View style={[styles.pulseCard, styles.segregationCard]}>
        <View style={styles.pulseLeft}>
          <Text style={[styles.pulseTitle, { color: '#b45309' }]}>
            SEGREGATION PULSE
          </Text>
          <View style={styles.pulseNumberRow}>
            <Text style={[styles.pulseBigValue, { color: '#92400e' }]}>
              {kpis.avgSegregationRating.toFixed(1)}
            </Text>
            <View style={styles.ratingMaxBox}>
              <Ionicons name="star" size={13} color={Colors.warning} />
              <Text style={styles.ratingMaxText}>/ 5.0</Text>
            </View>
          </View>
          <Text style={styles.pulseSub}>Average village rating</Text>
        </View>

        {/* 7-Day Segregation Rating Bars */}
        <View style={styles.sparklineContainer}>
          <Text style={[styles.sparklineLabel, { color: '#b45309' }]}>
            7-DAY RATING
          </Text>
          <View style={styles.barsRow}>
            {pulses.map((item, idx) => {
              const ratingVal = item.rating || 0;
              const heightPercent = Math.round((ratingVal / 5) * 100);
              const isTodayBar = idx === pulses.length - 1;
              return (
                <View key={`seg-${item.day || idx}`} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFillSeg,
                        { height: `${heightPercent}%` },
                        isTodayBar && styles.barFillSegToday,
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  rowTwoCards: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  kpiSmallCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  kpiCardAlert: {
    backgroundColor: '#fff5f5',
    borderColor: '#fed7d7',
  },
  kpiLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate500,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 4,
  },
  kpiBigNumber: {
    fontSize: 26,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    textAlign: 'center',
  },
  pulseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    ...Shadows.sm,
  },
  segregationCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  pulseLeft: {
    flex: 1,
  },
  pulseTitle: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
    letterSpacing: 0.8,
  },
  pulseNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
    marginTop: 2,
  },
  pulseBigValue: {
    fontSize: 28,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  diffBadgeUp: {
    backgroundColor: '#dcfce7',
  },
  diffBadgeDown: {
    backgroundColor: '#fee2e2',
  },
  diffText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
  },
  ratingMaxBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingMaxText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: '#b45309',
  },
  pulseSub: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
    marginTop: 2,
  },
  sparklineContainer: {
    width: 130,
    alignItems: 'flex-end',
  },
  sparklineLabel: {
    fontSize: 8,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 48,
  },
  barColumn: {
    alignItems: 'center',
    width: 14,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 10,
    height: 36,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 3,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: Colors.emerald600,
    borderRadius: 3,
  },
  barFillToday: {
    backgroundColor: Colors.emerald700,
  },
  barFillSeg: {
    width: '100%',
    backgroundColor: '#fbbf24',
    borderRadius: 3,
  },
  barFillSegToday: {
    backgroundColor: Colors.amber600,
  },
  barDayText: {
    fontSize: 8,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
    marginTop: 2,
  },
  barDayTextToday: {
    color: Colors.emerald700,
    fontFamily: Typography.fontFamilyBold,
  },
  barDayTextTodaySeg: {
    color: '#78350f',
    fontFamily: Typography.fontFamilyBold,
  },
});
