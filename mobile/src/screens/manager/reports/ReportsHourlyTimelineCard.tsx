/**
 * GreenPath Village Manager — Reports Tab: Hourly Collection Timeline Card
 *
 * Implements:
 * - Hourly collection distribution (5 AM – 6 PM)
 * - Stacked bar chart segments per vehicle with vehicle-assigned colors (matching web)
 * - Interactive hourly breakdown showing each vehicle's exact contribution & percentage
 * - Peak collection window indicator badge
 * - Vehicle color legend with total collections per vehicle
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import type { ReportHourlyTimeline } from '../../../types/manager';

interface ReportsHourlyTimelineCardProps {
  timeline: ReportHourlyTimeline;
}

const DEFAULT_VEHICLE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function ReportsHourlyTimelineCard({ timeline }: ReportsHourlyTimelineCardProps) {
  const hourlyData = timeline?.hourly || [];
  const vehicles = timeline?.vehicles || [];

  // Track selected hour for detailed breakdown (tap to inspect)
  const [selectedHour, setSelectedHour] = useState<string | null>(null);

  // Compute total collection count and per-vehicle breakdown for each hour
  const hoursWithTotals = hourlyData.map((slot) => {
    let sum = 0;
    const vehicleBreakdown = vehicles.map((v, i) => {
      const count = Number(slot[v.name] || 0);
      sum += count;
      return {
        name: v.name,
        color: v.color || DEFAULT_VEHICLE_COLORS[i % DEFAULT_VEHICLE_COLORS.length],
        count,
      };
    });

    return {
      hour: slot.hour,
      total: sum,
      vehicleBreakdown,
      breakdown: slot,
    };
  });

  const grandTotal = hoursWithTotals.reduce((acc, h) => acc + h.total, 0);

  // Identify peak hour
  let peakHour = hoursWithTotals[0];
  for (const item of hoursWithTotals) {
    if (item.total > (peakHour?.total || 0)) {
      peakHour = item;
    }
  }

  const maxHourlyCount = Math.max(1, ...hoursWithTotals.map((h) => h.total));

  // Default active hour to selected hour, or peak hour if none selected
  const activeHour = selectedHour ?? (peakHour && peakHour.total > 0 ? peakHour.hour : null);
  const activeHourItem = hoursWithTotals.find((h) => h.hour === activeHour);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.cardTitle}>COLLECTION TIMELINE</Text>
        </View>
        {grandTotal > 0 && peakHour && peakHour.total > 0 && (
          <View style={styles.peakBadge}>
            <Ionicons name="flash" size={11} color={Colors.emerald700} />
            <Text style={styles.peakBadgeText}>Peak: {peakHour.hour}</Text>
          </View>
        )}
      </View>

      {grandTotal === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={28} color={Colors.slate300} />
          <Text style={styles.emptyText}>No collections recorded for this date.</Text>
        </View>
      ) : (
        <View style={styles.content}>
          {/* Scrollable Hourly Stacked Bars */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timelineScroll}
          >
            {hoursWithTotals.map((item) => {
              const isPeak = item.hour === peakHour?.hour && item.total > 0;
              const isSelected = item.hour === activeHour;
              const barHeightPct = Math.round((item.total / maxHourlyCount) * 100);

              return (
                <TouchableOpacity
                  key={item.hour}
                  style={styles.timelineCol}
                  onPress={() => setSelectedHour((prev) => (prev === item.hour ? null : item.hour))}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.barCountLabel,
                      isSelected && styles.barCountLabelSelected,
                      isPeak && !isSelected && styles.barCountLabelPeak,
                    ]}
                  >
                    {item.total > 0 ? item.total : ''}
                  </Text>

                  {/* Bar Track with Stacked Vehicle Segments */}
                  <View
                    style={[
                      styles.barTrack,
                      isSelected && styles.barTrackSelected,
                    ]}
                  >
                    {item.total > 0 && (
                      <View
                        style={[
                          styles.barFillStack,
                          { height: `${barHeightPct}%` },
                        ]}
                      >
                        {item.vehicleBreakdown.map((vb) => {
                          if (vb.count <= 0) return null;
                          return (
                            <View
                              key={vb.name}
                              style={[
                                styles.barSegment,
                                {
                                  flex: vb.count,
                                  backgroundColor: vb.color,
                                },
                              ]}
                            />
                          );
                        })}
                      </View>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.hourLabel,
                      isSelected && styles.hourLabelSelected,
                      isPeak && !isSelected && styles.hourLabelPeak,
                    ]}
                  >
                    {item.hour}
                  </Text>
                  {isSelected && <View style={styles.selectedIndicatorDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Active Hour Vehicle Contribution Breakdown */}
          {activeHourItem && activeHourItem.total > 0 && (
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownHeaderRow}>
                <View style={styles.breakdownHourGroup}>
                  <Text style={styles.breakdownHourText}>{activeHourItem.hour} Contribution</Text>
                  {activeHourItem.hour === peakHour?.hour && (
                    <View style={styles.peakPill}>
                      <Text style={styles.peakPillText}>PEAK</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.breakdownTotalText}>
                  {activeHourItem.total} collections
                </Text>
              </View>

              <View style={styles.breakdownChipsRow}>
                {activeHourItem.vehicleBreakdown.map((vb) => {
                  if (vb.count <= 0) return null;
                  const pct = Math.round((vb.count / activeHourItem.total) * 100);
                  return (
                    <View key={vb.name} style={styles.breakdownChip}>
                      <View style={[styles.vehicleDot, { backgroundColor: vb.color }]} />
                      <Text style={styles.chipText}>
                        <Text style={styles.chipVehicleName}>{vb.name}: </Text>
                        <Text style={styles.chipCount}>{vb.count}</Text>
                        <Text style={styles.chipPct}> ({pct}%)</Text>
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Vehicle Color Legend */}
          {vehicles.length > 0 && (
            <View style={styles.legendWrap}>
              {vehicles.map((v, i) => {
                const color = v.color || DEFAULT_VEHICLE_COLORS[i % DEFAULT_VEHICLE_COLORS.length];
                const vTotal = hourlyData.reduce((acc, slot) => acc + Number(slot[v.name] || 0), 0);
                return (
                  <View key={v.name} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: color }]} />
                    <Text style={styles.legendText}>
                      {v.name}
                      {vTotal > 0 && <Text style={styles.legendCountText}> ({vTotal})</Text>}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
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
  cardTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate700,
    letterSpacing: 0.8,
  },
  peakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.emerald50,
    borderWidth: 1,
    borderColor: Colors.emerald100,
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  peakBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
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
  content: {
    gap: Spacing.md,
  },
  timelineScroll: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: Spacing.xs,
    minHeight: 120,
  },
  timelineCol: {
    alignItems: 'center',
    width: 38,
    justifyContent: 'flex-end',
  },
  barCountLabel: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate500,
    marginBottom: 4,
    height: 12,
  },
  barCountLabelSelected: {
    color: Colors.emerald700,
    fontFamily: Typography.fontFamilyBold,
  },
  barCountLabelPeak: {
    color: Colors.emerald700,
  },
  barTrack: {
    width: 18,
    height: 80,
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  barTrackSelected: {
    borderColor: Colors.emerald600,
    backgroundColor: Colors.slate200,
  },
  barFillStack: {
    width: '100%',
    flexDirection: 'column-reverse',
    overflow: 'hidden',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  barSegment: {
    width: '100%',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
  },
  hourLabel: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
    marginTop: 6,
  },
  hourLabelSelected: {
    color: Colors.emerald700,
    fontFamily: Typography.fontFamilyBold,
  },
  hourLabelPeak: {
    color: Colors.slate700,
    fontFamily: Typography.fontFamilyBold,
  },
  selectedIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.emerald600,
    marginTop: 3,
  },

  /* Active hour breakdown card */
  breakdownCard: {
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.slate200,
    gap: 6,
  },
  breakdownHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownHourGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownHourText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate700,
  },
  peakPill: {
    backgroundColor: Colors.emerald100,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  peakPillText: {
    fontSize: 8,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
    letterSpacing: 0.4,
  },
  breakdownTotalText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate600,
  },
  breakdownChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  breakdownChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  vehicleDot: {
    width: 7,
    height: 7,
    borderRadius: 2,
  },
  chipText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
  },
  chipVehicleName: {
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate700,
  },
  chipCount: {
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  chipPct: {
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
  },

  /* Legend */
  legendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
  },
  legendCountText: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
  },
});
