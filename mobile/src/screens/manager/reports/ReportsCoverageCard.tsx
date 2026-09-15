/**
 * GreenPath Village Manager — Reports Tab: Coverage & Efficiency Card
 *
 * Implements:
 * - Household collection efficiency progress with % / raw count toggle
 * - Full 360° circular progress ring (thick, no segments)
 * - Quick Insight banner (Outstanding Coverage vs Action Needed)
 * - Link to navigate to Collections Tab
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';

interface ReportsCoverageCardProps {
  collectedCount: number;
  totalHouseholds: number;
  onNavigateToCollections: () => void;
}

/* ---------- Full-circle progress ring (pure View, no SVG) ---------- */

const RING_SIZE = 148;
const RING_STROKE = 12;

interface CircularProgressProps {
  size: number;
  strokeWidth: number;
  percentage: number;
  activeColor: string;
  trackColor: string;
  children?: React.ReactNode;
}

/**
 * CSS-only circular progress.
 *
 * Technique:
 *  1. A circular View with a thick border acts as the track.
 *  2. Two half-circle clipper containers (left and right) each hold a
 *     half-circle "filler" that is rotated to cover the filled arc.
 *  3. For 0-50 % only the right filler rotates.
 *     For 50-100 % the right filler is fully open and the left filler rotates.
 */
function CircularProgress({
  size,
  strokeWidth,
  percentage,
  activeColor,
  trackColor,
  children,
}: CircularProgressProps) {
  const half = size / 2;
  const clamped = Math.max(0, Math.min(100, percentage));

  // Rotation angles
  const rightRotation = clamped <= 50 ? (clamped / 50) * 180 : 180;
  const leftRotation = clamped <= 50 ? 0 : ((clamped - 50) / 50) * 180;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Track ring (background) */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: half,
          borderWidth: strokeWidth,
          borderColor: trackColor,
        }}
      />

      {/* -------- Right half (0-180 deg clockwise from 12 o'clock) -------- */}
      <View
        style={{
          position: 'absolute',
          width: half,
          height: size,
          left: half,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: half,
            height: size,
            borderTopRightRadius: half,
            borderBottomRightRadius: half,
            borderWidth: strokeWidth,
            borderLeftWidth: 0,
            borderColor: activeColor,
            transform: [{ translateX: -half / 2 }, { rotate: `${rightRotation}deg` }, { translateX: half / 2 }],
          }}
        />
      </View>

      {/* -------- Left half (180-360 deg clockwise) -------- */}
      <View
        style={{
          position: 'absolute',
          width: half,
          height: size,
          left: 0,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: half,
            height: size,
            borderTopLeftRadius: half,
            borderBottomLeftRadius: half,
            borderWidth: strokeWidth,
            borderRightWidth: 0,
            borderColor: activeColor,
            transform: [{ translateX: half / 2 }, { rotate: `${leftRotation}deg` }, { translateX: -half / 2 }],
          }}
        />
      </View>

      {/* Center content */}
      <View
        style={{
          width: size - strokeWidth * 2 - 4,
          height: size - strokeWidth * 2 - 4,
          borderRadius: (size - strokeWidth * 2 - 4) / 2,
          backgroundColor: '#f0fdf4',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </View>
    </View>
  );
}

/* ---------- Card ---------- */

export function ReportsCoverageCard({
  collectedCount,
  totalHouseholds,
  onNavigateToCollections,
}: ReportsCoverageCardProps) {
  const [showRawCount, setShowRawCount] = useState(false);

  const percentage =
    totalHouseholds > 0
      ? Math.min(100, Math.round((collectedCount / totalHouseholds) * 100))
      : 0;

  const missedCount = Math.max(0, totalHouseholds - collectedCount);
  const isOutstanding = percentage >= 90;

  const activeColor = '#ec3333ff';
  const trackColor = '#189e49ff';

  const handleToggleMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowRawCount((prev) => !prev);
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.cardTitle}>COLLECTION EFFICIENCY</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onNavigateToCollections();
          }}
          style={styles.feedLink}
          activeOpacity={0.7}
        >
          <Text style={styles.feedLinkText}>View Feed</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.emerald700} />
        </TouchableOpacity>
      </View>

      {/* Circular Progress Ring */}
      <TouchableOpacity
        style={styles.gaugeContainer}
        onPress={handleToggleMode}
        activeOpacity={0.8}
      >
        <CircularProgress
          size={RING_SIZE}
          strokeWidth={RING_STROKE}
          percentage={percentage}
          activeColor={activeColor}
          trackColor={trackColor}
        >
          <Text style={styles.gaugeBigText}>
            {showRawCount ? collectedCount : `${percentage}%`}
          </Text>
          <Text style={styles.gaugeSubText}>
            {showRawCount ? `of ${totalHouseholds} homes` : 'covered today'}
          </Text>
          <Text style={styles.tapTipText}>(tap to toggle)</Text>
        </CircularProgress>
      </TouchableOpacity>

      {/* Centered Legend Row */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.emerald600 }]} />
          <Text style={styles.legendText}>
            Collected: <Text style={styles.legendValue}>{collectedCount}</Text>
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.destructive }]} />
          <Text style={styles.legendText}>
            Missed: <Text style={styles.legendValue}>{missedCount}</Text>
          </Text>
        </View>
      </View>

      {/* Quick Insight Banner */}
      <View
        style={[
          styles.insightBanner,
          isOutstanding ? styles.insightBannerSuccess : styles.insightBannerWarning,
        ]}
      >
        <Ionicons
          name={isOutstanding ? 'checkmark-circle' : 'alert-circle'}
          size={20}
          color={isOutstanding ? Colors.emerald700 : Colors.warning}
        />
        <View style={styles.insightContent}>
          <Text
            style={[
              styles.insightTitle,
              { color: isOutstanding ? Colors.emerald700 : '#b45309' },
            ]}
          >
            {isOutstanding ? 'Outstanding Coverage' : 'Coverage Needs Attention'}
          </Text>
          <Text style={styles.insightDesc}>
            {isOutstanding
              ? 'Village collection operations have met high coverage targets today.'
              : `${missedCount} households still uncollected. Monitor assigned fleet.`}
          </Text>
        </View>
      </View>
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
  feedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.emerald50,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  feedLinkText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  gaugeBigText: {
    fontSize: 30,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
    lineHeight: 34,
  },
  gaugeSubText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
    marginTop: 2,
  },
  tapTipText: {
    fontSize: 9,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
  },
  legendValue: {
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate800,
  },
  insightBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  insightBannerSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  insightBannerWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
  },
  insightDesc: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate600,
    marginTop: 1,
    lineHeight: 15,
  },
});
