/**
 * GreenPath Village Manager — Reports Tab: Daily Waste Material Breakdown Card
 *
 * Implements:
 * - Vertical bar chart matching the web application mobile view
 * - 5 Waste stream columns: Wet (#22c55e), Dry (#3b82f6), Sanitary (#ec4899), Special Care (#f59e0b), Mixed (#6b7280)
 * - Proportional vertical bars with top kg values and bottom labels
 * - Horizontal Cartesian grid lines
 * - Total waste collected aggregate (kg) badge in header
 * - Actionable empty state with "Log Waste Entries Now ›" button
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import type { ReportMaterialData } from '../../../types/manager';

interface ReportsMaterialBreakdownCardProps {
  materialData: ReportMaterialData;
  onNavigateToWasteLog: () => void;
}

const STREAM_CONFIG = [
  { key: 'wet', label: 'Wet', fullName: 'Organic Waste', color: '#22c55e' },
  { key: 'dry', label: 'Dry', fullName: 'Recyclables', color: '#3b82f6' },
  { key: 'sanitary', label: 'Sanitary', fullName: 'Sanitary Waste', color: '#ec4899' },
  { key: 'specialCare', label: 'Spl Care', fullName: 'Special Care', color: '#f59e0b' },
  { key: 'mixed', label: 'Mixed', fullName: 'Unsorted Mixed', color: '#6b7280' },
] as const;

export function ReportsMaterialBreakdownCard({
  materialData,
  onNavigateToWasteLog,
}: ReportsMaterialBreakdownCardProps) {
  const totalKg =
    materialData.wet +
    materialData.dry +
    materialData.sanitary +
    materialData.specialCare +
    materialData.mixed;

  const isLogged = materialData.isLogged && totalKg > 0;

  const weights = STREAM_CONFIG.map((s) => materialData[s.key] || 0);
  const maxWeight = Math.max(1, ...weights);

  return (
    <View style={styles.card}>
      {/* Card Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.cardTitle}>DAILY WASTE LOGS</Text>
        </View>
        {isLogged && (
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>{totalKg.toFixed(1)} kg Total</Text>
          </View>
        )}
      </View>

      {/* When data is NOT logged */}
      {!isLogged ? (
        <View style={styles.emptyContainer}>
          <View style={styles.trashIconsRow}>
            <View style={[styles.trashBadge, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="trash-bin" size={20} color="#22c55e" />
            </View>
            <View style={[styles.trashBadge, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="trash-bin" size={20} color="#3b82f6" />
            </View>
            <View style={[styles.trashBadge, { backgroundColor: '#fce7f3' }]}>
              <Ionicons name="trash-bin" size={20} color="#ec4899" />
            </View>
            <View style={[styles.trashBadge, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="trash-bin" size={20} color="#f59e0b" />
            </View>
            <View style={[styles.trashBadge, { backgroundColor: '#f3f4f6' }]}>
              <Ionicons name="trash-bin" size={20} color="#6b7280" />
            </View>
          </View>

          <Text style={styles.emptyTitle}>Waste Material Entries Not Logged</Text>
          <Text style={styles.emptySubtitle}>
            Daily waste weights have not been entered for this date.
          </Text>

          {/* Actionable button approved by user */}
          <TouchableOpacity
            style={styles.logWasteButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onNavigateToWasteLog();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={16} color={Colors.white} />
            <Text style={styles.logWasteButtonText}>Log Waste Entries Now ›</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Vertical Bar Chart matching web application */
        <View style={styles.chartContainer}>
          {/* Subtle Background Grid Lines */}
          <View style={styles.gridLinesOverlay} pointerEvents="none">
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
            <View style={styles.gridLineBase} />
          </View>

          {/* 5 Vertical Bar Columns */}
          <View style={styles.barsRow}>
            {STREAM_CONFIG.map((stream) => {
              const weight = materialData[stream.key] || 0;
              const fillPct =
                weight > 0 ? Math.max(8, Math.round((weight / maxWeight) * 100)) : 0;
              const pctOfTotal =
                totalKg > 0 ? ((weight / totalKg) * 100).toFixed(0) : '0';

              return (
                <View key={stream.key} style={styles.barColumn}>
                  {/* Top kg Value Label */}
                  <View style={styles.valLabelBox}>
                    <Text
                      style={[
                        styles.valLabelText,
                        weight > 0 && styles.valLabelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {weight > 0
                        ? `${weight >= 10 ? Math.round(weight) : weight.toFixed(1)}kg`
                        : '0kg'}
                    </Text>
                  </View>

                  {/* Vertical Bar Track & Fill */}
                  <View style={styles.barTrack}>
                    {weight > 0 && (
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${fillPct}%`,
                            backgroundColor: stream.color,
                          },
                        ]}
                      />
                    )}
                  </View>

                  {/* Bottom Category Label */}
                  <View style={styles.catLabelBox}>
                    <View
                      style={[styles.streamDot, { backgroundColor: stream.color }]}
                    />
                    <Text style={styles.streamNameText} numberOfLines={1}>
                      {stream.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
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
  totalBadge: {
    backgroundColor: Colors.emerald50,
    borderWidth: 1,
    borderColor: Colors.emerald100,
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  totalBadgeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.slate300,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.slate50,
  },
  trashIconsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  trashBadge: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate800,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  logWasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.emerald700,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
  },
  logWasteButtonText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
  chartContainer: {
    height: 190,
    justifyContent: 'flex-end',
    paddingTop: Spacing.xs,
    position: 'relative',
  },
  gridLinesOverlay: {
    position: 'absolute',
    top: 24,
    left: 0,
    right: 0,
    bottom: 46,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    backgroundColor: Colors.slate100,
  },
  gridLineBase: {
    height: 1.5,
    backgroundColor: Colors.slate200,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 185,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
  },
  valLabelBox: {
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  valLabelText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
  },
  valLabelActive: {
    color: Colors.slate800,
  },
  barTrack: {
    width: 30,
    flex: 1,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  catLabelBox: {
    alignItems: 'center',
    marginTop: 6,
    height: 20,
  },
  streamDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 2,
  },
  streamNameText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate700,
  },
  streamPctText: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyBold,
    marginTop: 1,
  },
});
