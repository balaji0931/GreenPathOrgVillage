/**
 * GreenPath Village Manager Mobile — Full-Screen Issue Management View
 *
 * Full-screen issue resolution flow embedded within the Issues tab:
 * - Keeps ManagerHeader and ManagerBottomNav active and visible
 * - Hardware BackHandler support to return to the issues list
 * - Top sticky navigation sub-header with back button and ticket badge
 * - Citizen complaint card with ExpandableText ('...Read more' / 'Show less')
 * - Citizen evidence photo inspection
 * - Status picker: Open (🔴), In Progress (🟡), Resolved (🟢)
 * - Manager reply multiline text input
 * - Camera / Gallery proof photo picker with expo-image-picker
 * - Automatic binary photo upload via uploadPhoto(uri)
 * - Server status update via updateManagerIssue
 */
import React, { useState, useEffect } from 'react';
import {
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
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { uploadPhoto } from '../../../api/upload.api';
import { updateManagerIssue } from '../../../api/manager.api';
import { formatCategoryLabel, formatRelativeTime } from './IssueCard';
import { ExpandableText } from '../../../components/common/ExpandableText';
import type { ManagerIssue, IssueStatus } from '../../../types/manager';

interface IssueManageViewProps {
  issue: ManagerIssue;
  onSuccess: (updatedIssue: ManagerIssue) => void;
  onBack: () => void;
  onViewPhoto: (photoUrl: string, title: string, subtitle: string) => void;
}

export function IssueManageView({
  issue,
  onSuccess,
  onBack,
  onViewPhoto,
}: IssueManageViewProps) {
  const [status, setStatus] = useState<IssueStatus>(issue.status);
  const [managerReply, setManagerReply] = useState<string>(issue.managerReply || '');
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(
    issue.managerProofPhotoUrl || null
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync state if issue changes
  useEffect(() => {
    setStatus(issue.status);
    setManagerReply(issue.managerReply || '');
    setLocalPhotoUri(null);
    setExistingPhotoUrl(issue.managerProofPhotoUrl || null);
  }, [issue]);

  // Intercept Android hardware back button to navigate back to list
  useEffect(() => {
    const handleHardwareBack = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onBack();
      return true;
    };
    const backHandlerSub = BackHandler.addEventListener(
      'hardwareBackPress',
      handleHardwareBack
    );
    return () => backHandlerSub.remove();
  }, [onBack]);

  // Camera capture for resolution proof
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
      console.warn('[IssueManageView] Error taking photo:', err);
    }
  };

  // Gallery picker for resolution proof
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
      console.warn('[IssueManageView] Error picking photo:', err);
    }
  };

  const handleRemovePhoto = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalPhotoUri(null);
    setExistingPhotoUrl(null);
  };

  const handleSubmit = async () => {
    const hasPhoto = Boolean(localPhotoUri || existingPhotoUrl);

    // Backend rule: proof photo mandatory when status is in_progress or resolved
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
    } catch (err: any) {
      console.warn('[IssueManageView] Failed to update issue:', err);
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

  const statusColor =
    issue.status === 'resolved'
      ? '#10b981'
      : issue.status === 'in_progress'
      ? '#f59e0b'
      : '#ef4444';

  const timeAgo = formatRelativeTime(issue.createdAt);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Sticky Top Navigation Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onBack();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.slate800} />
        </TouchableOpacity>

        <View style={styles.topNavCenter}>
          <Text style={styles.topNavTitle}>Manage issue</Text>
          <Text style={styles.topNavSubtitle}>Ticket #{issue.id}</Text>
        </View>

        <View style={[styles.statusMiniBadge, { backgroundColor: `${statusColor}18` }]}>
          <View style={[styles.statusMiniDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusMiniText, { color: statusColor }]}>
            {issue.status === 'resolved'
              ? 'Resolved'
              : issue.status === 'in_progress'
              ? 'In Progress'
              : 'Open'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Citizen Original Complaint Card */}
        <View style={styles.complaintCard}>
          <View style={styles.complaintHeaderRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {formatCategoryLabel(issue.category)}
              </Text>
            </View>
            {timeAgo ? <Text style={styles.timeAgoText}>{timeAgo}</Text> : null}
          </View>

          <Text style={styles.complaintTitle}>{issue.title}</Text>

          {/* Citizen Description with ExpandableText */}
          {issue.description ? (
            <View style={styles.descriptionWrap}>
              <ExpandableText
                text={issue.description}
                numberOfLines={3}
                charLimit={120}
                style={styles.complaintDescription}
                readMoreColor={Colors.emerald700}
              />
            </View>
          ) : null}

          {/* Citizen Evidence Photo & Reporter Info */}
          <View style={styles.complaintFooterRow}>
            {issue.photoUrl ? (
              <TouchableOpacity
                style={styles.evidenceThumbWrap}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onViewPhoto(issue.photoUrl!, 'Citizen Evidence', issue.title);
                }}
                activeOpacity={0.8}
              >
                <Image source={{ uri: issue.photoUrl }} style={styles.evidenceThumb} />
                <View style={styles.evidenceBadge}>
                  <Ionicons name="camera" size={11} color={Colors.white} />
                  <Text style={styles.evidenceBadgeText}>Evidence</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <View style={styles.reporterBox}>
              <Ionicons name="person-circle-outline" size={16} color={Colors.slate400} />
              <Text style={styles.reporterName}>
                Reported by <Text style={styles.reporterBold}>{issue.reportedBy || 'Resident'}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Section 1: Update Status */}
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
              <Ionicons name="information-circle" size={15} color="#b45309" />
              <Text style={styles.proofNoticeText}>
                Proof photo is required when changing status to '{status === 'resolved' ? 'Resolved' : 'In Progress'}'.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Section 2: Manager Reply */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MANAGER RESOLUTION NOTE / REPLY</Text>
          <TextInput
            style={styles.replyInput}
            value={managerReply}
            onChangeText={setManagerReply}
            placeholder="Describe action taken, resolution explanation, or instructions for field staff..."
            placeholderTextColor={Colors.slate400}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Section 3: Resolution Proof Photo */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderWithReq}>
            <Text style={styles.sectionLabel}>RESOLUTION PROOF PHOTO</Text>
            {isProofRequired ? (
              <Text style={styles.requiredStar}>* Mandatory</Text>
            ) : null}
          </View>

          {activePhotoUri ? (
            <View style={styles.photoPreviewCard}>
              <Image source={{ uri: activePhotoUri }} style={styles.photoPreview} />
              <View style={styles.photoActions}>
                <TouchableOpacity
                  style={styles.photoActionBtn}
                  onPress={handleTakePhoto}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera-outline" size={16} color={Colors.slate700} />
                  <Text style={styles.photoActionBtnText}>Retake</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.photoActionBtn, styles.photoActionBtnRemove]}
                  onPress={handleRemovePhoto}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color={Colors.destructive} />
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
                <View style={styles.photoPickerIconWrap}>
                  <Ionicons name="camera" size={22} color={Colors.emerald700} />
                </View>
                <Text style={styles.photoPickerBtnText}>Take Photo</Text>
                <Text style={styles.photoPickerSubtext}>Use Device Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoPickerBtn}
                onPress={handlePickPhoto}
                activeOpacity={0.7}
              >
                <View style={styles.photoPickerIconWrap}>
                  <Ionicons name="images" size={22} color={Colors.emerald700} />
                </View>
                <Text style={styles.photoPickerBtnText}>From Gallery</Text>
                <Text style={styles.photoPickerSubtext}>Select Image</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.footerActions}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onBack();
            }}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              isSubmitting && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={18} color={Colors.white} />
                <Text style={styles.submitBtnText}>Save Resolution</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
    ...Shadows.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.md,
  },
  backBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate700,
  },
  topNavCenter: {
    alignItems: 'center',
  },
  topNavTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  topNavSubtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
  },
  statusMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusMiniText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl + 20,
  },
  complaintCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.slate200,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  complaintHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    backgroundColor: Colors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeAgoText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
  },
  complaintTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    lineHeight: 22,
  },
  descriptionWrap: {
    backgroundColor: Colors.slate50,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.slate300,
  },
  complaintDescription: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    color: Colors.slate700,
    lineHeight: 19,
  },
  complaintFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  evidenceThumbWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  evidenceThumb: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.slate200,
  },
  evidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.emerald700,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  evidenceBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
  reporterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reporterName: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
  },
  reporterBold: {
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate700,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.slate200,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  sectionHeaderWithReq: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    letterSpacing: 1.1,
  },
  requiredStar: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.destructive,
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
    gap: 6,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    backgroundColor: Colors.slate50,
  },
  statusChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusChipText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate600,
  },
  proofNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: BorderRadius.md,
    padding: 10,
  },
  proofNoticeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: '#92400e',
    lineHeight: 16,
  },
  replyInput: {
    backgroundColor: Colors.slate50,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    color: Colors.slate900,
    minHeight: 90,
    lineHeight: 18,
  },
  photoPreviewCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.slate200,
    backgroundColor: Colors.slate100,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    backgroundColor: Colors.white,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.slate100,
  },
  photoActionBtnRemove: {
    backgroundColor: '#fee2e2',
  },
  photoActionBtnText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate700,
  },
  photoPickerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  photoPickerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.slate50,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.slate300,
    borderRadius: BorderRadius.lg,
    paddingVertical: 18,
    gap: 4,
  },
  photoPickerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.emerald50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  photoPickerBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate800,
  },
  photoPickerSubtext: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
  },
  footerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.slate300,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate700,
  },
  submitBtn: {
    flex: 2,
    height: 48,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.emerald700,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...Shadows.md,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
});
