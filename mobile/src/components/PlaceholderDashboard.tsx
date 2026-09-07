/**
 * Placeholder Dashboard Screen
 *
 * Temporary screen for each role — shows user info and logout button.
 * This is NOT a dashboard implementation. It exists solely to verify
 * authentication and role-based routing work correctly.
 */
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthProvider';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  moderator: 'Moderator',
  manager: 'Manager',
  collector: 'Collector',
  generator: 'Household',
  fieldworker: 'Field Worker',
};

export function PlaceholderDashboard() {
  const { user, logout, isLoading } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => logout(),
        },
      ],
    );
  };

  if (!user) return null;

  const roleLabel = ROLE_LABELS[user.role] || user.role;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/logo-full.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* User Card */}
        <View style={styles.card}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
          </View>

          <Text style={styles.greeting}>Welcome, {user.name}!</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID</Text>
            <Text style={styles.infoValue}>{user.userId}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue}>{roleLabel}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Village</Text>
            <Text style={styles.infoValue}>{user.villageId || 'N/A'}</Text>
          </View>
        </View>

        {/* Placeholder Notice */}
        <View style={styles.notice}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.emerald600} style={{ marginRight: 6 }} />
          <Text style={styles.noticeText}>
            Authentication verified. Dashboard implementation pending.
          </Text>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.slate50,
  },
  content: {
    flex: 1,
    padding: Spacing.xxl,
    gap: Spacing.xxl,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  logo: {
    width: 160,
    height: 40,
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    gap: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.emerald600,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  roleBadgeText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  greeting: {
    fontSize: 22,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate900,
  },

  // Notice
  notice: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  noticeText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily,
    color: Colors.emerald600,
    textAlign: 'center',
  },

  // Logout
  logoutButton: {
    height: 48,
    borderWidth: 1.5,
    borderColor: Colors.destructive,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.destructive,
  },
});
