/**
 * Collection Modal — Premium Full-Screen Overlay
 *
 * Matches web collector-dashboard.tsx collection form:
 * - Gradient emerald top bar with household name and translucent close button
 * - Clean white cards with centered uppercase labels
 * - Two-state buttons for Collection Status & Segregation with colored outlines and fills
 * - 5 round circular star buttons with active gold styling
 * - Distinct colored chips for waste types
 * - Centered weight input
 * - Dashed container for photo proof
 * - Interactive voice recording + text remarks
 * - Sticky bottom submit button with online/offline state
 * - SQLite-first instant acknowledgment
 */
import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { NOT_COLLECTED_REASONS } from '../../constants/collector';
import { getFriendlyErrorMessage } from '../../utils/errorMessage';
import { StarRating } from './StarRating';
import { WasteTypeSelector } from './WasteTypeSelector';
import { PhotoCapture } from './PhotoCapture';
import { VoiceRecorder } from './VoiceRecorder';
import { enqueueCollection, hasLocalCollectionToday } from '../../services/offline-queue';
import { triggerSync } from '../../services/sync-engine';
import { useNetwork } from '../../hooks/useNetwork';
import type { Household, VillageData, WasteType } from '../../types/collector';

interface CollectionModalProps {
  visible: boolean;
  household: Household | null;
  villageData: VillageData | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CollectionModal({
  visible,
  household,
  villageData,
  onClose,
  onSuccess,
}: CollectionModalProps) {
  const { isConnected } = useNetwork();
  // Progressive disclosure states (matches web app UX: start null and reveal step-by-step)
  const [status, setStatus] = useState<'collected' | 'missed' | null>(null);
  const [missedReason, setMissedReason] = useState('');
  const [isSegregated, setIsSegregated] = useState<boolean | null>(null);
  const [segregationRating, setSegregationRating] = useState(0);
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [weightKg, setWeightKg] = useState('');
  const [photoLocalUri, setPhotoLocalUri] = useState('');
  const [voiceLocalUri, setVoiceLocalUri] = useState('');
  const [remarks, setRemarks] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showReasonPicker, setShowReasonPicker] = useState(false);

  // Reset form when modal opens with new household
  const resetForm = () => {
    setStatus(null);
    setMissedReason('');
    setIsSegregated(null);
    setSegregationRating(0);
    setWasteTypes([]);
    setWeightKg('');
    setPhotoLocalUri('');
    setVoiceLocalUri('');
    setRemarks('');
    setShowReasonPicker(false);
    setShowConfirm(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Reset form whenever household changes or modal opens
  useEffect(() => {
    if (visible && household) {
      resetForm();
    }
  }, [household?.id, household?.uid, visible]);

  // Handle segregation choice (never pre-fill rating, user must tap a star)
  const handleSegregatedChange = (segregated: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSegregated(segregated);
    if (segregated) {
      if (wasteTypes.length === 0) setWasteTypes(['wet', 'dry']);
    } else {
      // If user had selected > 3 stars previously, clamp to max allowed (3)
      if (segregationRating > 3) setSegregationRating(3);
      if (wasteTypes.length === 0 || (wasteTypes.length === 2 && wasteTypes.includes('wet') && wasteTypes.includes('dry'))) {
        setWasteTypes(['mixed']);
      }
    }
  };

  // Validation
  const maxStars = isSegregated ? 5 : 3;
  const photoRequired =
    villageData?.imageUploadRequired ||
    (segregationRating > 0 && segregationRating <= 3);
  const showSegregation =
    (status === 'collected' || (status === 'missed' && missedReason === 'Waste Not segregated')) &&
    status !== null;

  const isFormValid = useMemo(() => {
    if (!status) return false;
    if (status === 'missed') {
      return !!missedReason;
    }
    if (status === 'collected') {
      if (isSegregated === null) return false;
      if (segregationRating === 0) return false;
      if (wasteTypes.length === 0) return false;
      if (photoRequired && !photoLocalUri) return false;
      if (villageData?.weightRequired && !weightKg) return false;
      return true;
    }
    return false;
  }, [
    status,
    missedReason,
    isSegregated,
    segregationRating,
    wasteTypes,
    photoLocalUri,
    weightKg,
    photoRequired,
    villageData,
  ]);

  const submitButtonText = useMemo(() => {
    if (!status) return 'SELECT COLLECTION STATUS';
    if (status === 'missed') {
      if (!missedReason) return 'SELECT REASON';
      return isConnected ? 'SUBMIT MISSED RECORD' : 'SAVE MISSED OFFLINE';
    }
    if (status === 'collected') {
      if (isSegregated === null) return 'SELECT SEGREGATION STATUS';
      if (segregationRating === 0) return 'RATE SEGREGATION';
      if (wasteTypes.length === 0) return 'SELECT WASTE TYPE';
      if (photoRequired && !photoLocalUri) return 'PHOTO REQUIRED';
      if (villageData?.weightRequired && !weightKg) return 'ENTER WEIGHT';
      return isConnected ? 'SUBMIT COLLECTION' : 'SAVE OFFLINE COLLECTION';
    }
    return 'COMPLETE REQUIRED FIELDS';
  }, [
    status,
    missedReason,
    isSegregated,
    segregationRating,
    wasteTypes,
    photoRequired,
    photoLocalUri,
    villageData,
    weightKg,
    isConnected,
  ]);

  // SQLite-first submission
  const handleSubmit = async () => {
    if (!household || !status) return;
    setShowConfirm(false);

    if (hasLocalCollectionToday(household.uid)) {
      Alert.alert(
        'Already Collected',
        'Collection already recorded for this household today.'
      );
      return;
    }

    try {
      await enqueueCollection({
        householdUid: household.uid,
        householdName: household.headName || '',
        houseNumber: household.houseNumber || '',
        status,
        missedReason: status === 'missed' ? missedReason : '',
        segregationRating: status === 'collected' || missedReason === 'Waste Not segregated' ? segregationRating : 0,
        wasteTypes: status === 'collected' ? wasteTypes : [],
        weightKg: status === 'collected' ? weightKg : '',
        photoLocalUri,
        voiceLocalUri,
        remarks,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleClose();
      onSuccess();
      triggerSync();
    } catch (err: any) {
      Alert.alert('Notice', getFriendlyErrorMessage(err, 'Failed to record collection. Please try again.'));
    }
  };

  if (!household) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Web-Style Premium Emerald Header */}
        <SafeAreaView style={styles.headerSafeArea}>
          <View style={styles.headerContent}>
            <View style={styles.headerTitleCol}>
              <Text style={styles.headerName} numberOfLines={1}>
                {household.headName || 'Household'}
              </Text>
              <Text style={styles.headerSubtitle}>
                H.No: {household.houseNumber || '—'} · UID: {household.uid}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Collection Status (Always visible first question) */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>WASTE COLLECTION STATUS</Text>
              <View style={styles.statusRow}>
                <TouchableOpacity
                  style={[
                    styles.statusBtn,
                    status === 'collected'
                      ? styles.statusCollectedActive
                      : styles.statusCollectedInactive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setStatus('collected');
                    setMissedReason('');
                    setShowReasonPicker(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={status === 'collected' ? '#ffffff' : '#15803d'}
                  />
                  <Text
                    style={[
                      styles.statusBtnText,
                      status === 'collected'
                        ? styles.statusCollectedTextActive
                        : styles.statusCollectedTextInactive,
                    ]}
                  >
                    Collected
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusBtn,
                    status === 'missed'
                      ? styles.statusMissedActive
                      : styles.statusMissedInactive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setStatus('missed');
                    setIsSegregated(null);
                    setSegregationRating(0);
                    setWasteTypes([]);
                    setShowReasonPicker(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={status === 'missed' ? '#ffffff' : '#b91c1c'}
                  />
                  <Text
                    style={[
                      styles.statusBtnText,
                      status === 'missed'
                        ? styles.statusMissedTextActive
                        : styles.statusMissedTextInactive,
                    ]}
                  >
                    Not Collected
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 1b. Reason if not collected (Progressive step for missed) */}
            {status === 'missed' && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>REASON FOR NOT COLLECTING *</Text>
                <TouchableOpacity
                  style={styles.pickerTrigger}
                  onPress={() => setShowReasonPicker(!showReasonPicker)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.pickerTriggerText,
                      !missedReason && styles.pickerTriggerPlaceholder,
                    ]}
                  >
                    {missedReason || 'Select reason for non-collection...'}
                  </Text>
                  <Ionicons
                    name={showReasonPicker ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={Colors.slate500}
                  />
                </TouchableOpacity>

                {showReasonPicker && (
                  <View style={styles.reasonDropdown}>
                    {NOT_COLLECTED_REASONS.map((reason) => {
                      const isSelected = missedReason === reason;
                      return (
                        <TouchableOpacity
                          key={reason}
                          style={[
                            styles.reasonDropdownItem,
                            isSelected && styles.reasonDropdownItemActive,
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setMissedReason(reason);
                            if (reason === 'Waste Not segregated') {
                              setIsSegregated(false);
                            }
                            setShowReasonPicker(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.reasonDropdownText,
                              isSelected && styles.reasonDropdownTextActive,
                            ]}
                          >
                            {reason}
                          </Text>
                          {isSelected && (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color={Colors.emerald600}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* 2. Segregation Question (Progressive step when collected or reason is Waste Not segregated) */}
            {showSegregation && (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>
                    WAS WASTE PROPERLY SEGREGATED?
                  </Text>
                  <View style={styles.segregationRow}>
                    <TouchableOpacity
                      style={[
                        styles.segBtn,
                        isSegregated === true
                          ? styles.segYesActive
                          : styles.segYesInactive,
                      ]}
                      onPress={() => handleSegregatedChange(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={isSegregated === true ? '#ffffff' : '#15803d'}
                      />
                      <Text
                        style={[
                          styles.segBtnText,
                          isSegregated === true
                            ? styles.segYesTextActive
                            : styles.segYesTextInactive,
                        ]}
                      >
                        Yes, Segregated
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.segBtn,
                        isSegregated === false
                          ? styles.segNoActive
                          : styles.segNoInactive,
                      ]}
                      onPress={() => handleSegregatedChange(false)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={isSegregated === false ? '#ffffff' : '#b91c1c'}
                      />
                      <Text
                        style={[
                          styles.segBtnText,
                          isSegregated === false
                            ? styles.segNoTextActive
                            : styles.segNoTextInactive,
                        ]}
                      >
                        No, Mixed
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 3. Star Rating (Progressive step once segregation question is answered) */}
                {isSegregated !== null && (
                  <View style={styles.card}>
                    <Text style={styles.cardLabel}>
                      HOW GOOD WAS THE SEGREGATION?
                    </Text>
                    <StarRating
                      value={segregationRating}
                      maxStars={maxStars}
                      onChange={setSegregationRating}
                    />
                  </View>
                )}
              </>
            )}

            {/* 4. Waste Types Collected (Progressive step once collected & segregation answered) */}
            {status === 'collected' && isSegregated !== null && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>TYPE OF WASTE RECEIVED *</Text>
                <WasteTypeSelector
                  selected={wasteTypes}
                  onChange={setWasteTypes}
                />
              </View>
            )}

            {/* 5. Weight (if required, only once collected & segregation answered) */}
            {status === 'collected' && isSegregated !== null && villageData?.weightRequired && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>COLLECTION WEIGHT (KG) *</Text>
                <TextInput
                  style={styles.weightInput}
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="0.0"
                  placeholderTextColor={Colors.slate400}
                  keyboardType="decimal-pad"
                />
              </View>
            )}

            {/* 6. Photo (Always available from Step 1) */}
            <View style={styles.card}>
              <View style={styles.cardHeaderWithIcon}>
                <Ionicons name="camera-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
                <Text style={styles.cardLabel}>
                  PHOTO {photoRequired ? '(REQUIRED)' : '(OPTIONAL)'}
                </Text>
              </View>
              <PhotoCapture
                photoUrl={photoLocalUri}
                onPhotoCapture={setPhotoLocalUri}
                required={photoRequired}
                localOnly
              />
            </View>

            {/* 7. Voice & Remarks (Always available from Step 1) */}
            <View style={styles.card}>
              <View style={styles.cardHeaderWithIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
                <Text style={styles.cardLabel}>REMARKS (OPTIONAL)</Text>
              </View>
              <View style={{ gap: 12 }}>
                <VoiceRecorder
                  voiceUrl={voiceLocalUri}
                  onVoiceCapture={setVoiceLocalUri}
                  localOnly
                />
                <TextInput
                  style={styles.textArea}
                  value={remarks}
                  onChangeText={setRemarks}
                  placeholder="Type any comments, house conditions, or notes..."
                  placeholderTextColor={Colors.slate400}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Extra padding at bottom for sticky footer */}
            <View style={{ height: 110 }} />
          </ScrollView>

          {/* Sticky Bottom Bar */}
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                !isFormValid
                  ? styles.submitBtnDisabled
                  : status === 'missed'
                    ? styles.submitBtnMissed
                    : isConnected
                      ? styles.submitBtnOnline
                      : styles.submitBtnOffline,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowConfirm(true);
              }}
              disabled={!isFormValid}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {isFormValid && (
                  <Ionicons
                    name={isConnected ? 'checkmark-circle' : 'save-outline'}
                    size={18}
                    color="#ffffff"
                  />
                )}
                <Text
                  style={[
                    styles.submitBtnText,
                    !isFormValid && styles.submitBtnTextDisabled,
                  ]}
                >
                  {submitButtonText}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Web-Style Confirmation Modal */}
        <Modal
          visible={showConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowConfirm(false)}
        >
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmDialog}>
              {/* Header Title */}
              <Text style={styles.confirmTitle}>
                {status === 'missed' ? 'Record Non-Collection?' : 'Submit Collection?'}
              </Text>

              {/* Subtitle with Clipboard Icon */}
              <View style={styles.confirmSubtitleRow}>
                <Ionicons name="clipboard-outline" size={18} color="#3b82f6" />
                <Text style={styles.confirmSubtitle}>
                  {status === 'missed'
                    ? 'Are you sure you want to record non-collection for:'
                    : 'Are you sure you want to submit this collection for:'}
                </Text>
              </View>

              {/* Highlighted Household Box (matches web bg-blue-50) */}
              <View style={styles.confirmHouseholdBox}>
                <Text style={styles.confirmHouseholdName} numberOfLines={1}>
                  {household.headName || 'Household'}
                </Text>
                <Text style={styles.confirmHouseholdUid}>
                  H.No: {household.houseNumber || '—'} · UID: {household.uid}
                </Text>
                {status === 'missed' && !!missedReason && (
                  <View style={styles.confirmReasonBadge}>
                    <Text style={styles.confirmReasonText}>
                      Reason: {missedReason}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons: Red Cancel & Green/Red OK Submit */}
              <View style={styles.confirmButtonsRow}>
                <TouchableOpacity
                  style={styles.confirmCancelBtn}
                  onPress={() => setShowConfirm(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={18} color="#b91c1c" />
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmSubmitBtn,
                    status === 'missed' && styles.confirmSubmitBtnMissed,
                  ]}
                  onPress={handleSubmit}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                  <Text style={styles.confirmSubmitText}>OK, Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerSafeArea: {
    backgroundColor: '#047857',
  },
  headerContent: {
    backgroundColor: '#047857',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 12 : 12,
    paddingBottom: 12,
    ...Shadows.md,
  },
  headerTitleCol: {
    flex: 1,
    gap: 1,
    paddingRight: 12,
  },
  headerName: {
    fontSize: 18,
    fontFamily: Typography.fontFamilyBold,
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.sm,
    gap: 6,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.xl,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: '#64748b',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 12,
  },
  cardHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  statusCollectedActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
    elevation: 0,
    shadowOpacity: 0,
  },
  statusCollectedInactive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
    elevation: 0,
    shadowOpacity: 0,
  },
  statusCollectedTextActive: {
    color: '#ffffff',
  },
  statusCollectedTextInactive: {
    color: '#15803d',
  },
  statusMissedActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
    elevation: 0,
    shadowOpacity: 0,
  },
  statusMissedInactive: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    elevation: 0,
    shadowOpacity: 0,
  },
  statusMissedTextActive: {
    color: '#ffffff',
  },
  statusMissedTextInactive: {
    color: '#b91c1c',
  },
  statusBtnText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  pickerTriggerText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate900,
  },
  pickerTriggerPlaceholder: {
    color: Colors.slate400,
  },
  reasonDropdown: {
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 6,
    overflow: 'hidden',
  },
  reasonDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  reasonDropdownItemActive: {
    backgroundColor: '#ecfdf5',
  },
  reasonDropdownText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: '#334155',
  },
  reasonDropdownTextActive: {
    fontFamily: Typography.fontFamilyBold,
    color: '#047857',
  },
  segregationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 52,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  segYesActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
    elevation: 0,
    shadowOpacity: 0,
  },
  segYesInactive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
    elevation: 0,
    shadowOpacity: 0,
  },
  segYesTextActive: {
    color: '#ffffff',
  },
  segYesTextInactive: {
    color: '#15803d',
  },
  segNoActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
    elevation: 0,
    shadowOpacity: 0,
  },
  segNoInactive: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    elevation: 0,
    shadowOpacity: 0,
  },
  segNoTextActive: {
    color: '#ffffff',
  },
  segNoTextInactive: {
    color: '#b91c1c',
  },
  segBtnText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
  },
  weightInput: {
    height: 56,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: BorderRadius.xl,
    fontSize: 24,
    fontFamily: Typography.fontFamilyBold,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    textAlign: 'center',
  },
  textArea: {
    height: 80,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingTop: 10,
    fontSize: 14,
    fontFamily: Typography.fontFamily,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    ...Shadows.md,
  },
  submitBtn: {
    height: 52,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.emeraldGlow,
  },
  submitBtnOnline: {
    backgroundColor: '#059669',
  },
  submitBtnOffline: {
    backgroundColor: '#2563eb',
  },
  submitBtnMissed: {
    backgroundColor: '#dc2626',
  },
  submitBtnDisabled: {
    backgroundColor: '#e2e8f0',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyBold,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  submitBtnTextDisabled: {
    color: '#94a3b8',
    fontSize: 13,
  },
  // Web-Style Confirmation Modal Styles
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  confirmDialog: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.xxl,
    padding: 20,
    gap: 16,
    ...Shadows.lg,
  },
  confirmTitle: {
    fontSize: 19,
    fontFamily: Typography.fontFamilyBold,
    color: '#0f172a',
    textAlign: 'center',
  },
  confirmSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  confirmSubtitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyMedium,
    color: '#475569',
    textAlign: 'center',
    flexShrink: 1,
  },
  confirmHouseholdBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: BorderRadius.lg,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  confirmHouseholdName: {
    fontSize: 17,
    fontFamily: Typography.fontFamilyBold,
    color: '#1e293b',
    textAlign: 'center',
  },
  confirmHouseholdUid: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: '#64748b',
    textAlign: 'center',
  },
  confirmReasonBadge: {
    marginTop: 4,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  confirmReasonText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilySemiBold,
    color: '#b91c1c',
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  confirmCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.xl,
    backgroundColor: '#fee2e2',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmCancelText: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyBold,
    color: '#b91c1c',
  },
  confirmSubmitBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.xl,
    backgroundColor: '#15803d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...Shadows.sm,
  },
  confirmSubmitBtnMissed: {
    backgroundColor: '#dc2626',
  },
  confirmSubmitText: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyBold,
    color: '#ffffff',
  },
});
