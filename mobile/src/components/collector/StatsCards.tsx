/**
 * Stats Cards for Collector Home
 *
 * 3 vibrant cards matching web collector-dashboard.tsx:
 * - Total Assigned (Royal Blue)
 * - Collected Today (Emerald Green)
 * - Village Total (Violet Purple)
 */
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { CollectorStats } from '../../types/collector';

interface StatsCardsProps {
  stats: CollectorStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <View style={styles.container}>
      {/* Collected Today */}
      <View style={[styles.card, styles.cardCollected]}>
        <Text style={styles.value}>{stats.collectedToday ?? 0}</Text>
        <Text style={styles.label}>YOU COLLECTED</Text>
      </View>

      {/* Village Total */}
      <View style={[styles.card, styles.cardVillage]}>
        <Text style={styles.value}>{stats.villageTodayCount ?? 0}</Text>
        <Text style={styles.label}>TODAY'S TOTAL</Text>
      </View>

      {/* Total Assigned */}
      <View style={[styles.card, styles.cardAssigned]}>
        <Text style={styles.value}>{stats.totalAssigned ?? 0}</Text>
        <Text style={styles.label}>VILLAGE'S TOTAL</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  card: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
    justifyContent: 'space-between',
    minHeight: 48,
  },
  cardAssigned: {
    backgroundColor: '#2563eb',
    ...Shadows.blueGlow,
  },
  cardCollected: {
    backgroundColor: '#059669',
    ...Shadows.emeraldGlow,
  },
  cardVillage: {
    backgroundColor: '#7c3aed',
    ...Shadows.purpleGlow,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  value: {
    fontSize: 24,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 8,
    fontFamily: Typography.fontFamilyBold,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.8,
    marginTop: 2,
  },
});
