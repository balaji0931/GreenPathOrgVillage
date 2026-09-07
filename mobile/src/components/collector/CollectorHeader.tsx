/**
 * Collector Header — Premium Brand Header
 *
 * Displays:
 * - GreenPath brand logo
 * - Live online/offline status pill
 * - Pending sync badge (if queue > 0)
 * - User avatar button
 */
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAuth } from '../../auth/AuthProvider';

interface CollectorHeaderProps {
  isOnline: boolean;
  onProfilePress: () => void;
}

export function CollectorHeader({
  isOnline,
  onProfilePress,
}: CollectorHeaderProps) {
  const { user } = useAuth();
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'C';

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

        {/* User Profile Avatar */}
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={onProfilePress}
          activeOpacity={0.8}
        >
          <Text style={styles.avatarText}>{initial}</Text>
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
    paddingVertical: Spacing.sm - 1,
    paddingHorizontal: Spacing.lg,
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
    width: 180,
    height: 45,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
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
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.emerald700,
  },
  statusTextOffline: {
    color: Colors.destructive,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    backgroundColor: Colors.blue50,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.blue100,
  },
  syncPillText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.blue600,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.emerald600,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.emerald100,
    ...Shadows.sm,
  },
  avatarText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
});
