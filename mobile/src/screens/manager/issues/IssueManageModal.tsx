/**
 * GreenPath Village Manager Mobile — Issue Management Modal
 *
 * Slide-up resolution bottom sheet:
 * - Status picker: Open, In Progress, Resolved
 * - Manager reply multiline text input
 * - Camera / Gallery proof photo picker via expo-image-picker
 * - Automatic binary photo upload via uploadPhoto(uri)
 * - Server status update via updateManagerIssue
 */
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { uploadPhoto } from '../../../api/upload.api';
import { updateManagerIssue } from '../../../api/manager.api';
import { formatCategoryLabel } from './IssueCard';
import type { ManagerIssue, IssueStatus } from '../../../types/manager';

interface IssueManageModalProps {
  visible: boolean;
  issue: ManagerIssue | null;
  onSuccess: (updatedIssue: ManagerIssue) => void;
  onClose: () => void;
}

export function IssueManageModal({
  visible,
  issue,
  onSuccess,
  onClose,
}: IssueManageModalProps) {
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<IssueStatus>('open');
  const [managerReply, setManagerReply] = useState<string>('');
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync state when issue opens
  useEffect(() => {
    if (issue) {
      setStatus(issue.status);
      setManagerReply(issue.managerReply || '');
      setLocalPhotoUri(null);
      setExistingPhotoUrl(issue.managerProofPhotoUrl || null);
    }
  }, [issue, visible]);

  if (!issue) return null;

  // Launch camera to snap resolution proof
  const handleTakePhoto = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { status: permStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (permStatus !== 'granted') {
        Alert.alert('Camera Permission', 'Camera access is required to take a proof photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setLocalPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('[IssueManageModal] Error taking photo:', err);
    }
  };

  // Pick photo from gallery
  const handlePickPhoto = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { status: permStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permStatus !== 'granted') {
        Alert.alert('Gallery Permission', 'Photo library access is required to select a proof image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setLocalPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('[IssueManageModal] Error picking photo:', err);
    }
  };

  const handleRemovePhoto = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalPhotoUri(null);
    setExistingPhotoUrl(null);
  };

  const handleSubmit = async () => {
    const hasPhoto = Boolean(localPhotoUri || existingPhotoUrl);

    // Business rule enforced by backend
    if ((status === 'in_progress' || status === 'resolved') && !hasPhoto) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Proof Photo Required',
        "A proof photo is required when updating issue status to 'In Progress' or 'Resolved'."
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    try {
      let finalPhotoUrl = existingPhotoUrl || undefined;

      // Upload local photo first if freshly captured
      if (localPhotoUri) {
        finalPhotoUrl = await uploadPhoto(localPhotoUri);
      }

      const updated = await updateManagerIssue(issue.id, {
        status,
        managerReply: managerReply.trim() || undefined,
        managerProofPhotoUrl: finalPhotoUrl,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.warn('[IssueManageModal] Failed to update issue:', err);
      Alert.alert(
        'Update Failed',
        err?.message || 'Failed to update issue status. Please check your internet connection.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePhotoUri = localPhotoUri || existingPhotoUrl;
  const isProofRequired = status === 'in_progress' || status === 'resolved';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <TouchableOpacity
          style={styles.dismissArea}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="create-outline" size={18} color={Colors.slate900} />
              <Text style={styles.headerTitle}>Manage issue</Text>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Ionicons name="close" size={20} color={Colors.slate600} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Issue Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle} numberOfLines={2}>
                {issue.title}
              </Text>
              {issue.description ? (
                <Text style={styles.summaryDescription} numberOfLines={3}>
                  {issue.description}
                </Text>
              ) : null}

              <View style={styles.summaryMetaRow}>
                <View style={styles.summaryBadge}>
                  <Text style={styles.summaryBadgeText}>
                    {formatCategoryLabel(issue.category)}
                  </Text>
                </View>
                <Text style={styles.summaryReporter}>by {issue.reportedBy || 'Resident'}</Text>
              </View>
            </View>

            {/* Status Picker */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>UPDATE STATUS</Text>
              <View style={styles.statusChipsRow}>
                {[
                  { id: 'open' as IssueStatus, label: 'Open', color: '#ef4444' },
                  { id: 'in_progress' as IssueStatus, label: 'In Progress', color: '#f59e0b' },
                  { id: 'resolved' as IssueStatus, label: 'Resolved', color: '#10b981' },
                ].map((s) => {
                  const isSelected = status === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.statusChip,
                        isSelected && { borderColor: s.color, backgroundColor: `${s.color}15` },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setStatus(s.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.statusChipDot, { backgroundColor: s.color }]} />
                      <Text
                        style={[
                          styles.statusChipText,
                          isSelected && { color: s.color, fontFamily: Typography.fontFamilyBold },
                        ]}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {isProofRequired ? (
                <View style={styles.proofNotice}>
                  <Ionicons name="information-circle" size={14} color="#b45309" />
                  <Text style={styles.proofNoticeText}>
                    Proof photo is required when updating status to '{status === 'resolved' ? 'Resolved' : 'In Progress'}'.
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Manager Reply Input */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>MANAGER REPLY</Text>
              <TextInput
                style={styles.replyInput}
                value={managerReply}
                onChangeText={setManagerReply}
                placeholder="Add resolution explanation or action steps taken..."
                placeholderTextColor={Colors.slate400}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Resolution Proof Photo Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderWithReq}>
                <Text style={styles.sectionLabel}>RESOLUTION PROOF PHOTO</Text>
                {isProofRequired ? (
                  <Text style={styles.requiredStar}>* Required</Text>
                ) : null}
              </View>

              {activePhotoUri ? (
                <View style={styles.photoPreviewCard}>
                  <Image source={{ uri: activePhotoUri }} style={styles.photoPreview} />
                  <View style={styles.photoActions}>
                    <TouchableOpacity
                      style={styles.photoActionBtn}
                      onPress={handleTakePhoto}
                    >
                      <Ionicons name="camera-outline" size={14} color={Colors.slate700} />
                      <Text style={styles.photoActionBtnText}>Retake</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.photoActionBtn, styles.photoActionBtnRemove]}
                      onPress={handleRemovePhoto}
                    >
                      <Ionicons name="trash-outline" size={14} color={Colors.destructive} />
                      <Text style={[styles.photoActionBtnText, { color: Colors.destructive }]}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.photoPickerRow}>
                  <TouchableOpacity
                    style={styles.photoPickerBtn}
                    onPress={handleTakePhoto}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera" size={20} color={Colors.emerald700} />
                    <Text style={styles.photoPickerBtnText}>Take Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.photoPickerBtn}
                    onPress={handlePickPhoto}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="images" size={20} color={Colors.emerald700} />
                    <Text style={styles.photoPickerBtnText}>From Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Bottom Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>Update issue</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '90%',
    ...Shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    maxHeight: 480,
  },
  scrollContent: {
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  summaryCard: {
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.slate100,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  summaryTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  summaryDescription: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate600,
    lineHeight: 16,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  summaryBadge: {
    backgroundColor: Colors.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  summaryBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
  },
  summaryReporter: {
    fontSize: 10,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
  },
  section: {
    gap: Spacing.xs + 2,
  },
  sectionHeaderWithReq: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    letterSpacing: 0.8,
  },
  requiredStar: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: '#b91c1c',
  },
  statusChipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statusChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.slate50,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
  },
  statusChipDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusChipText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate700,
  },
  proofNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  proofNoticeText: {
    flex: 1,
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: '#92400e',
    lineHeight: 15,
  },
  replyInput: {
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.slate200,
    padding: Spacing.md,
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate900,
    minHeight: 80,
  },
  photoPickerRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  photoPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.emerald50,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  photoPickerBtnText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
  },
  photoPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.slate200,
    padding: Spacing.sm,
  },
  photoPreview: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.slate200,
  },
  photoActions: {
    flex: 1,
    gap: 6,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate200,
    alignSelf: 'flex-start',
  },
  photoActionBtnRemove: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  photoActionBtnText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate700,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate600,
  },
  submitBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.emerald700,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
});
