/**
 * GreenPath Village Manager Mobile — Map Screen: Stats Strip
 *
 * 3-Card Summary Strip:
 * - Collected count
 * - Pending count
 * - Coverage percentage
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';

interface MapStatsStripProps {
  collected: number;
  pending: number;
  total: number;
}

export function MapStatsStrip({ collected, pending, total }: MapStatsStripProps) {
  const coveragePct = total > 0 ? Math.round((collected / total) * 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.valueText}>{collected}</Text>
        <Text style={[styles.labelText, { color: Colors.emerald700 }]}>Collected</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.valueText}>{pending}</Text>
        <Text style={[styles.labelText, { color: Colors.slate400 }]}>Pending</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.valueText}>{coveragePct}%</Text>
        <Text style={[styles.labelText, { color: Colors.blue600 }]}>Coverage</Text>
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
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  valueText: {
    fontSize: 18,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    lineHeight: 22,
  },
  labelText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 2,
  },
});
