/**
 * GreenPath Village Manager — Tab 1: Daily Reports & KPI Pulse Screen
 *
 * Primary operational dashboard view:
 * - Daily Pulse metrics: Total waste kg, Wet kg, Dry kg, Segregation %
 * - Household coverage ring / progress summary
 * - Active collector status summary
 * - Pull to refresh
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { ManagerVillageData } from '../../types/manager';

interface ManagerReportsScreenProps {
  villageData: ManagerVillageData | null;
  onNavigateToTab: (tab: 'collections' | 'map-viz' | 'issues' | 'more') => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export function ManagerReportsScreen({
  villageData,
  onNavigateToTab,
  isRefreshing = false,
  onRefresh,
}: ManagerReportsScreenProps) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[Colors.emerald700]}
            tintColor={Colors.emerald700}
          />
        ) : undefined
      }
    >
      {/* Village Banner */}
      <View style={styles.bannerCard}>
        <View style={styles.bannerLeft}>
          <Text style={styles.bannerGreeting}>Good day, Manager</Text>
          <Text style={styles.bannerVillage}>{villageData?.name || 'GreenPath Village'}</Text>
          <Text style={styles.bannerDate}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View style={styles.bannerIconBadge}>
          <Ionicons name="leaf" size={28} color={Colors.emerald700} />
        </View>
      </View>

      {/* KPI Grid */}
      <View style={styles.kpiGrid}>
        {/* Total Collected */}
        <View style={[styles.kpiCard, { borderColor: Colors.emerald100 }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: Colors.emerald50 }]}>
            <Ionicons name="scale-outline" size={20} color={Colors.emerald700} />
          </View>
          <Text style={styles.kpiValue}>-- kg</Text>
          <Text style={styles.kpiLabel}>Total Waste Today</Text>
        </View>

        {/* Segregation Index */}
        <View style={[styles.kpiCard, { borderColor: Colors.blue100 }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: Colors.blue50 }]}>
            <Ionicons name="pie-chart-outline" size={20} color={Colors.blue600} />
          </View>
          <Text style={[styles.kpiValue, { color: Colors.blue600 }]}>-- %</Text>
          <Text style={styles.kpiLabel}>Segregation Index</Text>
        </View>

        {/* Wet Waste */}
        <View style={[styles.kpiCard, { borderColor: Colors.borderLight }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: Colors.emerald50 }]}>
            <Ionicons name="water-outline" size={20} color={Colors.emerald700} />
          </View>
          <Text style={styles.kpiValue}>-- kg</Text>
          <Text style={styles.kpiLabel}>Wet (Organic)</Text>
        </View>

        {/* Dry Waste */}
        <View style={[styles.kpiCard, { borderColor: Colors.borderLight }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: Colors.warningLight }]}>
            <Ionicons name="cube-outline" size={20} color={Colors.amber600} />
          </View>
          <Text style={styles.kpiValue}>-- kg</Text>
          <Text style={styles.kpiLabel}>Dry (Recyclable)</Text>
        </View>
      </View>

      {/* Household Coverage Card */}
      <View style={styles.coverageCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderTitleRow}>
            <Ionicons name="home-outline" size={18} color={Colors.slate700} />
            <Text style={styles.cardTitle}>Household Coverage</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onNavigateToTab('collections');
            }}
          >
            <Text style={styles.linkText}>View Feed ›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: '0%' }]} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>--</Text>
            <Text style={styles.statText}>Collected</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>--</Text>
            <Text style={styles.statText}>Pending</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statNumber, { color: Colors.destructive }]}>--</Text>
            <Text style={styles.statText}>Missed</Text>
          </View>
        </View>
      </View>

      {/* Phase 2 Notification */}
      <View style={styles.phaseNotice}>
        <Ionicons name="information-circle-outline" size={18} color={Colors.emerald700} />
        <Text style={styles.phaseNoticeText}>
          Navigation Frame Active. Daily live report charts, session timelines & metrics will connect in Phase 2.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.slate200,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  bannerLeft: {
    flex: 1,
  },
  bannerGreeting: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
  },
  bannerVillage: {
    fontSize: 18,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    marginTop: 2,
  },
  bannerDate: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.emerald700,
    marginTop: 4,
  },
  bannerIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.emerald50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  kpiCard: {
    width: '47.5%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  kpiValue: {
    fontSize: 18,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  kpiLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
    marginTop: 2,
  },
  coverageCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.slate200,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cardHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  linkText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.emerald700,
  },
  progressRow: {
    marginBottom: Spacing.md,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.slate100,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.emerald700,
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.xs,
  },
  statCol: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate800,
  },
  statText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
    marginTop: 2,
  },
  phaseNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.emerald50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  phaseNoticeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.emerald700,
    lineHeight: 16,
  },
});
