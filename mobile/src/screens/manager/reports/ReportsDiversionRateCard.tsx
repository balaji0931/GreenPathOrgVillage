/**
 * GreenPath Village Manager — Reports Tab: Waste Diversion Rate Card
 *
 * - Horizontal progress bar showing diversion rate
 * - Large percentage readout with color-coded status badge
 * - Two-column Diverted vs Landfill stream summary (kg + description)
 * - Proportional multi-colored waste breakdown bar
 * - Stream tags row (Wet, Dry, Mixed, Sanitary, Special Care)
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import type { ReportMaterialData } from '../../../types/manager';

interface ReportsDiversionRateCardProps {
  materialData: ReportMaterialData;
}

export function ReportsDiversionRateCard({ materialData }: ReportsDiversionRateCardProps) {
  const divertedKg = (materialData?.wet || 0) + (materialData?.dry || 0);
  const landfillKg =
    (materialData?.mixed || 0) +
    (materialData?.sanitary || 0) +
    (materialData?.specialCare || 0);
  const totalKg = divertedKg + landfillKg;

  const hasData = materialData?.isLogged && totalKg > 0;
  const diversionRate = hasData ? Math.round((divertedKg / totalKg) * 100) : 0;

  // Status configuration matching web application
  const statusColor =
    diversionRate >= 70 ? '#22c55e' : diversionRate >= 40 ? '#f59e0b' : '#ef4444';
  const statusBg =
    diversionRate >= 70 ? '#dcfce7' : diversionRate >= 40 ? '#fef3c7' : '#fee2e2';
  const statusLabel =
    diversionRate >= 70 ? 'Excellent' : diversionRate >= 40 ? 'Needs Improvement' : 'Critical';

  const activeStreams = [
    { label: 'Wet', value: materialData?.wet || 0, color: '#22c55e' },
    { label: 'Dry', value: materialData?.dry || 0, color: '#3b82f6' },
    { label: 'Mixed', value: materialData?.mixed || 0, color: '#6b7280' },
    { label: 'Sanitary', value: materialData?.sanitary || 0, color: '#ec4899' },
    { label: 'Spl Care', value: materialData?.specialCare || 0, color: '#f59e0b' },
  ].filter((item) => item.value > 0);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.cardTitle}>WASTE DIVERSION RATE</Text>
        </View>
      </View>

      {!hasData ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={28} color={Colors.slate300} />
          <Text style={styles.emptyText}>
            Diversion rate will compute automatically once waste entries are logged.
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          {/* Rate display + status badge */}
          <View style={styles.rateRow}>
            <Text style={[styles.rateNumber, { color: statusColor }]}>
              {diversionRate}%
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>

          {/* Horizontal progress bar — green (diverted) on red (non-diverted) */}
          <View style={[styles.progressTrack, { backgroundColor: '#ef4444' }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${diversionRate}%`,
                  backgroundColor: '#22c55e',
                },
              ]}
            />
          </View>

          {/* Diverted vs Landfill Legend (2 columns) */}
          <View style={styles.legendRow}>
            <View style={styles.legendCol}>
              <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
              <View style={styles.legendColText}>
                <Text style={styles.legendWeight}>{divertedKg.toFixed(1)} kg</Text>
                <Text style={styles.legendCaption}>Diverted (Wet+Dry)</Text>
              </View>
            </View>

            <View style={styles.legendCol}>
              <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
              <View style={styles.legendColText}>
                <Text style={styles.legendWeight}>{landfillKg.toFixed(1)} kg</Text>
                <Text style={styles.legendCaption}>Landfill Stream</Text>
              </View>
            </View>
          </View>

          {/* Proportional Multi-Colored Breakdown Bar */}
          {totalKg > 0 && (
            <View style={styles.breakdownSection}>
              <View style={styles.proportionalBar}>
                {(materialData?.wet || 0) > 0 && (
                  <View
                    style={{
                      width: `${(materialData.wet / totalKg) * 100}%`,
                      backgroundColor: '#22c55e',
                    }}
                  />
                )}
                {(materialData?.dry || 0) > 0 && (
                  <View
                    style={{
                      width: `${(materialData.dry / totalKg) * 100}%`,
                      backgroundColor: '#3b82f6',
                    }}
                  />
                )}
                {(materialData?.mixed || 0) > 0 && (
                  <View
                    style={{
                      width: `${(materialData.mixed / totalKg) * 100}%`,
                      backgroundColor: '#6b7280',
                    }}
                  />
                )}
                {(materialData?.sanitary || 0) > 0 && (
                  <View
                    style={{
                      width: `${(materialData.sanitary / totalKg) * 100}%`,
                      backgroundColor: '#ec4899',
                    }}
                  />
                )}
                {(materialData?.specialCare || 0) > 0 && (
                  <View
                    style={{
                      width: `${(materialData.specialCare / totalKg) * 100}%`,
                      backgroundColor: '#f59e0b',
                    }}
                  />
                )}
              </View>

              {/* Stream Category Tags */}
              <View style={styles.streamTagsRow}>
                {activeStreams.map((stream) => (
                  <View key={stream.label} style={styles.streamTag}>
                    <View
                      style={[styles.streamTagDot, { backgroundColor: stream.color }]}
                    />
                    <Text style={styles.streamTagText}>{stream.label}</Text>
                  </View>
                ))}
              </View>
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
    marginBottom: Spacing.sm,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate700,
    letterSpacing: 0.8,
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
    gap: Spacing.sm,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rateNumber: {
    fontSize: 36,
    fontFamily: Typography.fontFamilyBold,
    lineHeight: 40,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  legendCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendColText: {
    flexDirection: 'column',
  },
  legendWeight: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  legendCaption: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    letterSpacing: 0.2,
  },
  breakdownSection: {
    marginTop: Spacing.xs,
  },
  proportionalBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  streamTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: 6,
  },
  streamTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streamTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  streamTagText: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate500,
    textTransform: 'uppercase',
  },
});
