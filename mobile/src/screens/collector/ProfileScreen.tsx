/**
 * Profile Screen
 * User info card, change password, logout.
 * Matches web collector-dashboard.tsx profile tab.
 */
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal, Alert,
  ActivityIndicator, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { changePassword } from '../../api/collector.api';
import { useAuth, type User } from '../../auth/AuthProvider';
import { getFriendlyErrorMessage } from '../../utils/errorMessage';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  moderator: 'Moderator',
  manager: 'Manager',
  collector: 'Collector',
  generator: 'Household',
  fieldworker: 'Field Worker',
};

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  if (!user) return null;

  const roleLabel = ROLE_LABELS[user.role] || user.role;

  const handleChangePassword = async () => {
    if (newPassword.length < 4) {
      Alert.alert('Validation', 'Password must be at least 4 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation', 'Passwords do not match.');
      return;
    }
    setIsChanging(true);
    try {
      await changePassword(newPassword);
      Alert.alert('Success', 'Password changed successfully.');
      setShowChangePassword(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      Alert.alert('Notice', getFriendlyErrorMessage(err, 'Failed to change password. Please try again.'));
    } finally {
      setIsChanging(false);
    }
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    try {
      await logout();
    } catch {
      // logout clears local state regardless
    }
  };

  return (
    <View style={styles.container}>
      {/* Fixed Top Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Account details & security</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* User Hero Card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userId}>User ID: {user.userId}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{roleLabel}</Text>
        </View>
      </View>

      {/* Account Settings */}
      <View style={styles.sectionWrapper}>
        <Text style={styles.sectionHeader}>ACCOUNT & SECURITY</Text>
        <View style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowChangePassword(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: Colors.blue50 }]}>
                <Ionicons name="lock-closed" size={18} color={Colors.blue600} />
              </View>
              <View>
                <Text style={styles.settingText}>Change Password</Text>
                <Text style={styles.settingSubtext}>Update your login credentials</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, styles.settingItemLast]}
            onPress={() => setShowLogoutConfirm(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: Colors.destructiveLight }]}>
                <Ionicons name="log-out" size={18} color={Colors.destructive} />
              </View>
              <View>
                <Text style={[styles.settingText, { color: Colors.destructive }]}>Logout</Text>
                <Text style={styles.settingSubtext}>Sign out of this device</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
          </TouchableOpacity>
        </View>
      </View>

        {/* App Info */}
        <View style={styles.appInfoCard}>
          <Text style={styles.appInfoText}>GreenPath Mobile Application</Text>
          <Text style={styles.appVersionText}>Version 1.0.0 (Expo Dev)</Text>
        </View>

      {/* Change Password Modal */}
      <Modal visible={showChangePassword} animationType="slide" onRequestClose={() => setShowChangePassword(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowChangePassword(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={Colors.slate600} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.formContent}>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>NEW PASSWORD (MIN 4 CHARS)</Text>
              <TextInput
                style={styles.formInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={Colors.slate400}
                secureTextEntry
              />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>CONFIRM NEW PASSWORD</Text>
              <TextInput
                style={styles.formInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                placeholderTextColor={Colors.slate400}
                secureTextEntry
              />
            </View>
            <TouchableOpacity
              style={[styles.submitButton, (newPassword.length < 4 || newPassword !== confirmPassword) && styles.submitDisabled]}
              onPress={handleChangePassword}
              disabled={isChanging || newPassword.length < 4 || newPassword !== confirmPassword}
              activeOpacity={0.8}
            >
              {isChanging ? <ActivityIndicator color={Colors.white} /> : (
                <>
                  <Ionicons name="shield-checkmark" size={18} color={Colors.white} />
                  <Text style={styles.submitText}>Update Password</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Logout Confirmation */}
      <ConfirmDialog
        visible={showLogoutConfirm}
        title="Confirm Logout"
        message="Are you sure you want to log out of your GreenPath account?"
        confirmText="Logout"
        destructive
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
    zIndex: 10,
  },
  title: {
    fontSize: 20,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl + 20,
  },
  userCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.emerald600,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    borderWidth: 3,
    borderColor: Colors.emerald100,
    ...Shadows.emeraldGlow,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
  userName: {
    fontSize: 20,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  userId: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
  },
  roleBadge: {
    backgroundColor: Colors.emerald50,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.emerald100,
    marginTop: Spacing.xs,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
    letterSpacing: 0.8,
  },
  sectionWrapper: {
    gap: Spacing.xs + 2,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    letterSpacing: 0.6,
    paddingHorizontal: Spacing.xs,
  },
  settingsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.slate200,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate800,
  },
  settingSubtext: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    marginTop: 1,
  },
  appInfoCard: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: 2,
  },
  appInfoText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
  },
  appVersionText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    backgroundColor: Colors.white,
    paddingTop: Platform.OS === 'ios' ? 48 : 20,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
    ...Shadows.sm,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.slate300,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContent: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  formSection: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.slate200,
    gap: Spacing.xs,
    ...Shadows.sm,
  },
  formLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate500,
    letterSpacing: 0.5,
  },
  formInput: {
    height: 46,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    fontFamily: Typography.fontFamily,
    color: Colors.slate900,
    backgroundColor: Colors.slate50,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    backgroundColor: Colors.emerald600,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.md,
    ...Shadows.emeraldGlow,
  },
  submitDisabled: {
    backgroundColor: Colors.slate300,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
});
