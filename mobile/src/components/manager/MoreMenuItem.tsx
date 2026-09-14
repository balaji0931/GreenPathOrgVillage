/**
 * GreenPath Village Manager — Reusable Menu Item for "More" Groups
 *
 * Renders an interactive row with an icon badge, title, subtitle, and right chevron.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import type { MoreMenuItemDescriptor } from '../../types/manager';

interface MoreMenuItemProps {
  item: MoreMenuItemDescriptor;
  onPress: (id: MoreMenuItemDescriptor['id']) => void;
  isLast?: boolean;
}

export function MoreMenuItem({ item, onPress, isLast = false }: MoreMenuItemProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(item.id);
  };

  return (
    <TouchableOpacity
      style={[styles.container, !isLast && styles.borderBottom]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.label}, ${item.description}`}
    >
      {/* Left: Soft-Colored Icon Badge */}
      <View style={[styles.iconBadge, { backgroundColor: item.iconBgColor }]}>
        <Ionicons
          name={item.iconName as keyof typeof Ionicons.glyphMap}
          size={18}
          color={item.iconColor}
        />
      </View>

      {/* Center: Title & Short Subtitle */}
      <View style={styles.textCol}>
        <View style={styles.titleRow}>
          <Text style={styles.label} numberOfLines={1}>
            {item.label}
          </Text>
          {item.badgeCount !== undefined && item.badgeCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{item.badgeCount}</Text>
            </View>
          )}
        </View>
        <Text style={styles.description} numberOfLines={1}>
          {item.description}
        </Text>
      </View>

      {/* Right: Chevron Arrow */}
      <Ionicons name="chevron-forward" size={16} color={Colors.slate300} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textCol: {
    flex: 1,
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  label: {
    fontSize: 14,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate900,
  },
  description: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: Colors.emerald50,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  countBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
  },
});
