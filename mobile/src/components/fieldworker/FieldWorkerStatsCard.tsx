/**
 * Field Worker Stats Cards Component
 *
 * Displays overview statistics:
 * - Total Mapped (Emerald)
 * - Today's Mappings (Blue)
 * - Pending Offline Sync (Amber if > 0, Emerald if synced)
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { FieldWorkerStats } from '../../types/fieldworker';

interface FieldWorkerStatsCardProps {
  stats: FieldWorkerStats;
}

export function FieldWorkerStatsCard({ stats }: FieldWorkerStatsCardProps) {
  const isSyncClean = stats.pendingSync === 0;

  return (
    <View style={styles.container}>
      {/* Today Mapped */}
      <View style={[styles.card, styles.cardToday]}>
        <Text style={styles.cardValue}>{stats.todayMapped}</Text>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>MY MAPPINGS - TODAY</Text>
        </View>
      </View>

      {/* Pending Sync */}
      <View style={[styles.card, isSyncClean ? styles.cardSyncClean : styles.cardSyncPending]}>
        <Text style={[styles.cardValue, !isSyncClean && { color: Colors.amber600 }]}>
          {stats.pendingSync}
        </Text>
        <Text style={styles.cardTitle}>
          SYNC: {isSyncClean ? 'All synced' : 'Pending upload'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    ...Shadows.sm,
  },
  cardTotal: {
    borderColor: Colors.emerald100,
  },
  cardToday: {
    borderColor: Colors.blue100,
  },
  cardSyncClean: {
    borderColor: Colors.emerald100,
  },
  cardSyncPending: {
    borderColor: '#fed7aa', // amber-200
    backgroundColor: '#fffbeb', // amber-50
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    letterSpacing: 0.5,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleEmerald: {
    backgroundColor: Colors.emerald50,
  },
  iconCircleBlue: {
    backgroundColor: Colors.blue50,
  },
  iconCircleAmber: {
    backgroundColor: '#fef3c7',
  },
  cardValue: {
    fontSize: 20,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    marginBottom: 2,
  },
  cardSubtext: {
    fontSize: 10,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
  },
});
