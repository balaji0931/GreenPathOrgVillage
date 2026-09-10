/**
 * Field Worker Profile Screen
 *
 * Worker credentials card, change password modal, offline sync info, and logout.
 * Dedicated screen for Field Worker role.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { changePassword } from '../../api/auth.api';
import { useAuth } from '../../auth/AuthProvider';
import { getFriendlyErrorMessage } from '../../utils/errorMessage';

export function FieldWorkerProfileScreen() {
  const { user, logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  if (!user) return null;

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
        <Text style={styles.subtitle}>Field worker account & settings</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Worker Hero Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userId}>User ID: {user.userId}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="location" size={13} color={Colors.emerald700} />
            <Text style={styles.roleBadgeText}>Field Worker</Text>
          </View>
          {Boolean(user.villageId) && (
            <View style={styles.villageRow}>
              <Ionicons name="home-outline" size={14} color={Colors.slate500} />
              <Text style={styles.villageText}>Village ID: {user.villageId}</Text>
            </View>
          )}
        </View>

        {/* Account & Security */}
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
                  <Text style={[styles.settingText, { color: Colors.destructive }]}>Log Out</Text>
                  <Text style={styles.settingSubtext}>Sign out from this device</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showChangePassword} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => setShowChangePassword(false)}
                hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
              >
                <Ionicons name="close" size={24} color={Colors.slate500} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                placeholder="Enter new password (min 4 chars)"
                placeholderTextColor={Colors.slate400}
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                placeholder="Re-enter new password"
                placeholderTextColor={Colors.slate400}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={() => setShowChangePassword(false)}
                disabled={isChanging}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSave]}
                onPress={handleChangePassword}
                disabled={isChanging}
              >
                {isChanging ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.btnSaveText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        visible={showLogoutConfirm}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        destructive
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
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
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: 20,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  userCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    ...Shadows.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.emerald700,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
  userName: {
    fontSize: 18,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  userId: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.emerald50,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  roleBadgeText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.emerald700,
    textTransform: 'uppercase',
  },
  villageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: 4,
  },
  villageText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
  },
  sectionWrapper: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate400,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
    letterSpacing: 0.5,
  },
  settingsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
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
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate800,
  },
  settingSubtext: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    marginTop: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate800,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate700,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 15,
    fontFamily: Typography.fontFamily,
    color: Colors.slate900,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  btn: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: Colors.slate100,
  },
  btnCancelText: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
  },
  btnSave: {
    backgroundColor: Colors.emerald700,
  },
  btnSaveText: {
    fontSize: 15,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.white,
  },
});
