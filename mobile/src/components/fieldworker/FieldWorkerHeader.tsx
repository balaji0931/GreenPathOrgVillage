/**
 * Field Worker Header — Clean Brand Header
 *
 * Displays:
 * - GreenPath brand logo
 * - Live online/offline network status pill
 * - Direct Logout button on the right (no 3-dot menu needed since profile is in bottom nav)
 */
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface FieldWorkerHeaderProps {
  isOnline: boolean;
  onLogoutPress: () => void;
}

export function FieldWorkerHeader({
  isOnline,
  onLogoutPress,
}: FieldWorkerHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <Image
          source={require('../../../assets/logo-full.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.right}>
        {/* Network Status Pill */}
        <View style={[styles.statusPill, !isOnline && styles.statusPillOffline]}>
          <View style={[styles.statusDot, !isOnline && styles.statusDotOffline]} />
          <Text style={[styles.statusText, !isOnline && styles.statusTextOffline]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>

        {/* Direct Logout Icon Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={onLogoutPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Logout"
        >
          <Ionicons name="log-out-outline" size={21} color={Colors.slate600} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    ...Shadows.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 34,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    backgroundColor: Colors.emerald50,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  statusPillOffline: {
    backgroundColor: Colors.destructiveLight,
    borderColor: '#fecaca',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.emerald500,
  },
  statusDotOffline: {
    backgroundColor: Colors.destructive,
  },
  statusText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.emerald700,
  },
  statusTextOffline: {
    color: Colors.destructive,
  },
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.slate50,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
});
