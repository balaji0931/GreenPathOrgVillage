/**
 * GreenPath Village Manager — Top Navigation Header
 *
 * Requirements:
 * - Left: Square [G] logo badge
 * - Center/Left: 2-line title stack (Line 1: Village Name, Line 2: Active Tab/Screen Subtitle)
 * - Right: Alerts/Announcements bell with unread dot + Profile Avatar circle with initial
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface ManagerHeaderProps {
  villageName?: string;
  subtitle: string;
  announcementsCount?: number;
  userName?: string;
  onPressAnnouncements: () => void;
  onPressProfile: () => void;
}

export function ManagerHeader({
  villageName = 'GreenPath Village',
  subtitle,
  announcementsCount = 0,
  userName = 'Manager',
  onPressAnnouncements,
  onPressProfile,
}: ManagerHeaderProps) {
  const insets = useSafeAreaInsets();
  const initial = (userName.trim().charAt(0) || 'M').toUpperCase();

  const handlePressAnnouncements = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressAnnouncements();
  };

  const handlePressProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressProfile();
  };

  return (
    <View style={[styles.wrapper, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 12 : 16) }]}>
      <View style={styles.container}>
        {/* Left: Square [G] Brand Logo & 2-Line Title Stack */}
        <View style={styles.leftCol}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>G</Text>
          </View>
          <View style={styles.titleStack}>
            <Text style={styles.villageName} numberOfLines={1}>
              {villageName}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
        </View>

        {/* Right: Announcements Bell + Profile Avatar */}
        <View style={styles.rightCol}>
          {/* Announcements Bell */}
          <TouchableOpacity
            style={styles.actionIconButton}
            onPress={handlePressAnnouncements}
            accessibilityLabel="Announcements and Alerts"
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.slate700} />
            {announcementsCount > 0 && (
              <View style={styles.notificationDot} />
            )}
          </TouchableOpacity>

          {/* Profile Avatar */}
          <TouchableOpacity
            style={styles.profileAvatar}
            onPress={handlePressProfile}
            accessibilityLabel="Manager Profile and Settings"
            activeOpacity={0.7}
          >
            <Text style={styles.profileAvatarText}>{initial}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
    ...Shadows.sm,
    zIndex: 10,
  },
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  leftCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginRight: Spacing.sm,
  },
  brandBadge: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.emerald700,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  brandBadgeText: {
    fontSize: 20,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  titleStack: {
    flex: 1,
    justifyContent: 'center',
  },
  villageName: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
    marginTop: 1,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionIconButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.slate50,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.destructive,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.emerald700,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.emerald100,
  },
  profileAvatarText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
});
