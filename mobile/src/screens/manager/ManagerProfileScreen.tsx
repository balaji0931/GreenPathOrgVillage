/**
 * GreenPath Village Manager — Dedicated Profile & Account Screen
 *
 * Rendered when the profile avatar in the top header navigation is clicked:
 * - Manager identity card: Avatar, Name, User ID, Role badge, Village name
 * - Account & Preferences group:
 *   - Change Password
 *   - Language Preferences
 *   - Log Out with confirmation dialog
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { MoreGroupCard } from '../../components/manager/MoreGroupCard';
import { MoreMenuItem } from '../../components/manager/MoreMenuItem';
import type {
  ManagerMoreScreenId,
  ManagerVillageData,
  MoreMenuItemDescriptor,
} from '../../types/manager';

interface ManagerProfileScreenProps {
  villageData: ManagerVillageData | null;
  userName?: string;
  userId?: string;
  userRole?: string;
  onSelectScreen: (screenId: ManagerMoreScreenId) => void;
  onBack: () => void;
  onLogout: () => void;
}

export function ManagerProfileScreen({
  villageData,
  userName = 'Manager',
  userId = 'MGR',
  userRole = 'MANAGER',
  onSelectScreen,
  onBack,
  onLogout,
}: ManagerProfileScreenProps) {
  const initial = (userName.trim().charAt(0) || 'M').toUpperCase();

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  };

  const handleLogoutPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of GreenPath Manager?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: onLogout,
        },
      ]
    );
  };

  const accountItems: MoreMenuItemDescriptor[] = [
    {
      id: 'change-password',
      label: 'Change Password',
      description: 'Update your manager login credentials',
      iconName: 'key-outline',
      iconColor: Colors.slate700,
      iconBgColor: Colors.slate100,
    },
    {
      id: 'language',
      label: 'Language',
      description: 'Change application display language',
      iconName: 'globe-outline',
      iconColor: Colors.slate700,
      iconBgColor: Colors.slate100,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityLabel="Back to previous screen"
        >
          <Ionicons name="arrow-back" size={20} color={Colors.slate700} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manager Profile</Text>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{initial}</Text>
          </View>
          <Text style={styles.profileName} numberOfLines={1}>
            {userName}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.profileUserId}>{userId}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{userRole}</Text>
            </View>
          </View>

          {villageData?.name && (
            <View style={styles.villageBox}>
              <Ionicons name="location-outline" size={14} color={Colors.emerald700} />
              <Text style={styles.villageText} numberOfLines={1}>
                {villageData.name}
              </Text>
            </View>
          )}

          {/* Quick Village Geography Details */}
          {(villageData?.taluk || villageData?.district) && (
            <Text style={styles.geoText}>
              {[villageData.taluk, villageData.district, villageData.state].filter(Boolean).join(' • ')}
            </Text>
          )}
        </View>

        {/* Account & Preferences Group */}
        <MoreGroupCard title="Account & Preferences">
          {accountItems.map((item) => (
            <MoreMenuItem
              key={item.id}
              item={item}
              onPress={onSelectScreen}
              isLast={false}
            />
          ))}

          {/* Logout Action Row */}
          <TouchableOpacity
            style={styles.logoutRow}
            onPress={handleLogoutPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Log out of GreenPath Manager"
          >
            <View style={styles.logoutIconBadge}>
              <Ionicons name="log-out-outline" size={18} color={Colors.destructive} />
            </View>
            <Text style={styles.logoutText}>Log Out</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.slate300} />
          </TouchableOpacity>
        </MoreGroupCard>

        {/* Application Info Footer */}
        <View style={styles.appFooter}>
          <Text style={styles.appFooterBrand}>GreenPath Village</Text>
          <Text style={styles.appFooterVersion}>Version 1.0.0 (Enterprise Android)</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
    ...Shadows.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: 4,
    paddingRight: Spacing.md,
  },
  backText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate700,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    marginLeft: 'auto',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.slate200,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  avatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.emerald700,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 3,
    borderColor: Colors.emerald100,
    ...Shadows.sm,
  },
  avatarLargeText: {
    fontSize: 26,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
  profileName: {
    fontSize: 18,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
    marginBottom: Spacing.sm,
  },
  profileUserId: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
  },
  roleBadge: {
    backgroundColor: Colors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  roleBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate700,
  },
  villageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.emerald50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.emerald100,
    marginTop: 2,
  },
  villageText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.emerald700,
  },
  geoText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    marginTop: Spacing.xs,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
  },
  logoutIconBadge: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.destructiveLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  logoutText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.destructive,
  },
  appFooter: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: 2,
  },
  appFooterBrand: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
  },
  appFooterVersion: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
  },
});
