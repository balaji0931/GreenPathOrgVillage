/**
 * GreenPath Village Manager — Reusable Group Card Container for "More" Tools
 *
 * Wraps a collection of menu items in an elegant rounded container with a title badge.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface MoreGroupCardProps {
  title: string;
  badge?: string;
  children: React.ReactNode;
}

export function MoreGroupCard({ title, badge, children }: MoreGroupCardProps) {
  return (
    <View style={styles.groupWrapper}>
      {/* Group Header Label */}
      <View style={styles.headerRow}>
        <Text style={styles.groupTitle}>{title.toUpperCase()}</Text>
        {badge && (
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>

      {/* Group Card Container */}
      <View style={styles.cardContainer}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  groupWrapper: {
    marginBottom: Spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xs + 2,
  },
  groupTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    letterSpacing: 0.8,
  },
  badgePill: {
    backgroundColor: Colors.emerald50,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.emerald700,
  },
  cardContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.slate200,
    overflow: 'hidden',
    ...Shadows.sm,
  },
});
