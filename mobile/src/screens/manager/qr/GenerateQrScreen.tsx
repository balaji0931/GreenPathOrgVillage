/**
 * GreenPath Village Manager — Generate QR Codes Screen
 *
 * Implements:
 * - Real-time visual quota meter card (used, remaining, max limit)
 * - Quick-select preset chips (+10, +25, +50, +100, +250, Max)
 * - Number stepper with A4 sheet count estimator
 * - Direct server DB batch creation via POST /api/qr-codes/batch (~200ms)
 * - Post-generation instant action modal (Print & Share PDF Now / View in Batches)
 * - 100% client-side PDF export with zero server rendering
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import {
  fetchManagerQrStats,
  createManagerQrBatch,
} from '../../../api/manager.api';
import {
  exportAndShareQrPdf,
} from '../../../services/qr-pdf-export.service';
import { resolveUnitLabel } from '../../../utils/qr-matrix';
import type {
  ManagerVillageData,
  ManagerQrStats,
  ManagerQrBatchResponse,
} from '../../../types/manager';

interface GenerateQrScreenProps {
  villageData?: ManagerVillageData | null;
  onBack: () => void;
  onNavigateToDownload: () => void;
}

export function GenerateQrScreen({
  villageData,
  onBack,
  onNavigateToDownload,
}: GenerateQrScreenProps) {
  const [stats, setStats] = useState<ManagerQrStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [batchQuantity, setBatchQuantity] = useState<number>(25);
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdBatch, setCreatedBatch] = useState<ManagerQrBatchResponse | null>(null);
  const [isSharingPdf, setIsSharingPdf] = useState(false);

  const unitType = (villageData as any)?.unitType;
  const unitLabel = resolveUnitLabel(unitType);

  const loadStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const data = await fetchManagerQrStats();
      setStats(data);
      // Auto-adjust default quantity if remaining is small
      if (data && data.remaining > 0 && data.remaining < 25) {
        setBatchQuantity(data.remaining);
      }
    } catch (err) {
      console.warn('[GenerateQrScreen] Failed to load stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const maxRemaining = stats?.remaining ?? 500;
  const totalLimit = stats?.max ?? 0;
  const totalUsed = stats?.total ?? 0;
  const usedPercentage = totalLimit > 0 ? Math.min(100, (totalUsed / totalLimit) * 100) : 0;
  const isLimitReached = stats !== null && stats.remaining === 0;

  // Preset chips (capped at max batch size of 500)
  const PRESETS = [10, 25, 50, 100, 250, 500];

  const handleSelectPreset = (qty: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const target = Math.min(qty, maxRemaining > 0 ? maxRemaining : 500);
    setBatchQuantity(Math.max(1, target));
  };

  const handleSelectMax = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (maxRemaining > 0) {
      setBatchQuantity(Math.min(500, maxRemaining));
    }
  };

  const handleStep = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBatchQuantity((prev) => {
      const next = prev + delta;
      const upper = maxRemaining > 0 ? Math.min(500, maxRemaining) : 500;
      return Math.max(1, Math.min(next, upper));
    });
  };

  const handleGenerate = async () => {
    if (batchQuantity < 1 || isLimitReached || isGenerating) return;

    if (maxRemaining > 0 && batchQuantity > maxRemaining) {
      Alert.alert(
        'Quota Exceeded',
        `You can only generate up to ${maxRemaining} more QR codes for this village.`
      );
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsGenerating(true);
      const res = await createManagerQrBatch(batchQuantity);
      setCreatedBatch(res);
      await loadStats();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Generation Failed', err?.message || 'Could not generate QR code batch. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintBatchNow = async () => {
    if (!createdBatch || createdBatch.qrCodes.length === 0) return;

    try {
      setIsSharingPdf(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await exportAndShareQrPdf({
        items: createdBatch.qrCodes,
        title: `Batch_${createdBatch.batchId}`,
        unitType,
        villageName: villageData?.name,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Failed to generate sticker PDF.');
    } finally {
      setIsSharingPdf(false);
    }
  };

  const estimatedSheets = Math.ceil(batchQuantity / 9);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onBack();
          }}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.slate700} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Generate QR Codes</Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onNavigateToDownload();
          }}
          style={styles.headerActionBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="folder-open-outline" size={17} color={Colors.emerald700} />
          <Text style={styles.headerActionText}>Batches</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quota Progress Card */}
        <View style={styles.quotaCard}>
          <View style={styles.quotaCardHeader}>
            <View style={styles.quotaTitleWrap}>
              <View style={styles.indicatorDot} />
              <Text style={styles.quotaCardTitle}>HOUSEHOLD QR QUOTA</Text>
            </View>
            <View style={styles.unitBadge}>
              <Ionicons name="pricetag-outline" size={12} color={Colors.emerald700} />
              <Text style={styles.unitBadgeText}>{unitLabel} Stickers</Text>
            </View>
          </View>

          {loadingStats ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={Colors.emerald600} />
              <Text style={styles.loadingText}>Loading quota statistics...</Text>
            </View>
          ) : (
            <>
              {/* Main Gauge Progress */}
              <View style={styles.gaugeBox}>
                <View style={styles.gaugeLabels}>
                  <Text style={styles.gaugeUsedText}>
                    {totalUsed} / {totalLimit} Used
                  </Text>
                  <Text
                    style={[
                      styles.gaugeRemainingText,
                      isLimitReached && styles.gaugeRemainingDanger,
                    ]}
                  >
                    {stats?.remaining ?? 0} remaining
                  </Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${usedPercentage}%`,
                        backgroundColor:
                          isLimitReached
                            ? Colors.destructive
                            : usedPercentage > 80
                              ? Colors.amber600
                              : Colors.emerald500,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Stat breakdown pills */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats?.total ?? 0}</Text>
                  <Text style={styles.statLabel}>Generated</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: Colors.emerald700 }]}>
                    {stats?.mapped ?? 0}
                  </Text>
                  <Text style={styles.statLabel}>Mapped</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: Colors.amber600 }]}>
                    {stats?.unmapped ?? 0}
                  </Text>
                  <Text style={styles.statLabel}>Unmapped</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: Colors.slate700 }]}>
                    {stats?.remaining ?? 0}
                  </Text>
                  <Text style={styles.statLabel}>Remaining</Text>
                </View>
              </View>

              {isLimitReached && (
                <View style={styles.limitAlert}>
                  <Ionicons name="alert-circle" size={16} color={Colors.destructive} />
                  <Text style={styles.limitAlertText}>
                    Village quota limit reached ({totalLimit}). Contact support@greenpathindia.in to increase your household limit.
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Batch Configuration Card */}
        <View style={styles.configCard}>
          <Text style={styles.sectionHeader}>SELECT BATCH SIZE</Text>

          {/* Preset Chips */}
          <View style={styles.presetChipsRow}>
            {PRESETS.map((p) => {
              const isSelected = batchQuantity === p;
              const isDisabled = maxRemaining > 0 && p > maxRemaining;
              return (
                <TouchableOpacity
                  key={p}
                  onPress={() => handleSelectPreset(p)}
                  disabled={isDisabled || isLimitReached}
                  style={[
                    styles.presetChip,
                    isSelected && styles.presetChipActive,
                    isDisabled && styles.presetChipDisabled,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      isSelected && styles.presetChipTextActive,
                      isDisabled && styles.presetChipTextDisabled,
                    ]}
                  >
                    +{p}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {maxRemaining > 0 && (
              <TouchableOpacity
                onPress={handleSelectMax}
                disabled={isLimitReached}
                style={[
                  styles.presetChip,
                  styles.presetChipMax,
                  batchQuantity === Math.min(500, maxRemaining) && styles.presetChipActive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    styles.presetChipTextMax,
                    batchQuantity === Math.min(500, maxRemaining) && styles.presetChipTextActive,
                  ]}
                >
                  Max
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Stepper Input */}
          <Text style={styles.sectionHeader}>BATCH SIZE</Text>
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              onPress={() => handleStep(-10)}
              disabled={batchQuantity <= 1 || isLimitReached}
              style={[styles.stepBtn, (batchQuantity <= 1 || isLimitReached) && styles.stepBtnDisabled]}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={20} color={Colors.slate700} />
            </TouchableOpacity>

            <View style={styles.stepperInputBox}>
              <TextInput
                value={String(batchQuantity)}
                onChangeText={(val) => {
                  const num = parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
                  setBatchQuantity(Math.min(500, num));
                }}
                keyboardType="number-pad"
                maxLength={3}
                style={styles.stepperInput}
                editable={!isLimitReached}
              />
            </View>

            <TouchableOpacity
              onPress={() => handleStep(10)}
              disabled={batchQuantity >= Math.min(500, maxRemaining) || isLimitReached}
              style={[
                styles.stepBtn,
                (batchQuantity >= Math.min(500, maxRemaining) || isLimitReached) && styles.stepBtnDisabled,
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color={Colors.slate700} />
            </TouchableOpacity>
          </View>

          {/* Sheet layout calculation info */}
          <View style={styles.sheetInfoBox}>
            <Ionicons name="document-text-outline" size={15} color={Colors.emerald700} />
            <Text style={styles.sheetInfoText}>
              Formats into <Text style={styles.sheetInfoBold}>{estimatedSheets} A4 sheet{estimatedSheets > 1 ? 's' : ''}</Text> (9 stickers per page) ready for local printing.
            </Text>
          </View>

          {/* Generate Action Button */}
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={isLimitReached || batchQuantity < 1 || isGenerating}
            style={[
              styles.generateBtn,
              (isLimitReached || batchQuantity < 1 || isGenerating) && styles.generateBtnDisabled,
            ]}
            activeOpacity={0.8}
          >
            {isGenerating ? (
              <View style={styles.btnRow}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.generateBtnText}>Creating Batch in Database...</Text>
              </View>
            ) : (
              <View style={styles.btnRow}>
                <Ionicons name="qr-code-outline" size={18} color="#ffffff" />
                <Text style={styles.generateBtnText}>
                  Generate {batchQuantity} QR Codes
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Post-Generation Success Modal */}
      <Modal
        visible={createdBatch !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCreatedBatch(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.celebrationCard}>
            <View style={styles.successIconBox}>
              <Ionicons name="checkmark-circle" size={54} color={Colors.emerald600} />
            </View>

            <Text style={styles.celebrationTitle}>Batch Created!</Text>
            <Text style={styles.celebrationSubtitle}>
              Batch <Text style={styles.celebrationBatchId}>{createdBatch?.batchId}</Text> with{' '}
              <Text style={styles.celebrationBatchId}>{createdBatch?.count}</Text> QR codes is ready.
            </Text>

            <View style={styles.celebrationDetails}>
              <View style={styles.celebrationDetailRow}>
                <Ionicons name="copy-outline" size={15} color={Colors.slate500} />
                <Text style={styles.celebrationDetailText}>
                  UID Range: {createdBatch?.qrCodes[0]?.uid} →{' '}
                  {createdBatch?.qrCodes[createdBatch.qrCodes.length - 1]?.uid}
                </Text>
              </View>
              <View style={styles.celebrationDetailRow}>
                <Ionicons name="print-outline" size={15} color={Colors.slate500} />
                <Text style={styles.celebrationDetailText}>
                  Sticker Sheets: {Math.ceil((createdBatch?.count || 0) / 9)} A4 Pages (3×3 Grid)
                </Text>
              </View>
            </View>

            {/* Instant Actions */}
            <View style={styles.celebrationActions}>
              <TouchableOpacity
                onPress={handlePrintBatchNow}
                disabled={isSharingPdf}
                style={[styles.modalActionPrimary, isSharingPdf && styles.modalActionDisabled]}
                activeOpacity={0.8}
              >
                {isSharingPdf ? (
                  <View style={styles.btnRow}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.modalActionPrimaryText}>Rendering PDF...</Text>
                  </View>
                ) : (
                  <View style={styles.btnRow}>
                    <Ionicons name="share-social" size={17} color="#ffffff" />
                    <Text style={styles.modalActionPrimaryText}>Print & Share PDF Now</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setCreatedBatch(null);
                  onNavigateToDownload();
                }}
                style={styles.modalActionSecondary}
                activeOpacity={0.7}
              >
                <Ionicons name="folder-open-outline" size={16} color={Colors.slate700} />
                <Text style={styles.modalActionSecondaryText}>View in Download Batches</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setCreatedBatch(null)}
                style={styles.modalActionGhost}
                activeOpacity={0.6}
              >
                <Text style={styles.modalActionGhostText}>Done / Generate Another</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.slate50,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingRight: 8,
  },
  backText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate700,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.emerald50,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  headerActionText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.emerald700,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl + 20,
  },
  quotaCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
    marginBottom: Spacing.md,
  },
  quotaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  quotaTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.emerald500,
  },
  quotaCardTitle: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate500,
    letterSpacing: 0.8,
  },
  unitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.emerald50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  unitBadgeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.emerald700,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.slate500,
    fontFamily: Typography.fontFamily,
  },
  gaugeBox: {
    marginBottom: Spacing.md,
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  gaugeUsedText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate800,
  },
  gaugeRemainingText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate500,
  },
  gaugeRemainingDanger: {
    color: Colors.destructive,
  },
  track: {
    height: 8,
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 18,
    backgroundColor: Colors.slate200,
  },
  limitAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#fef2f2',
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  limitAlertText: {
    flex: 1,
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: '#b91c1c',
    lineHeight: 16,
  },
  configCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm + 2,
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.slate100,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  presetChipActive: {
    backgroundColor: Colors.emerald600,
    borderColor: Colors.emerald600,
  },
  presetChipDisabled: {
    opacity: 0.4,
  },
  presetChipMax: {
    backgroundColor: Colors.emerald50,
    borderColor: Colors.emerald100,
  },
  presetChipText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate700,
  },
  presetChipTextActive: {
    color: Colors.white,
  },
  presetChipTextDisabled: {
    color: Colors.slate400,
  },
  presetChipTextMax: {
    color: Colors.emerald700,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.slate200,
    marginBottom: Spacing.md,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  stepBtnDisabled: {
    opacity: 0.3,
  },
  stepperInputBox: {
    alignItems: 'center',
  },
  stepperInput: {
    fontSize: 24,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    textAlign: 'center',
    minWidth: 80,
    padding: 0,
  },
  stepperUnitText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
    marginTop: 1,
  },
  sheetInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.emerald50,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  sheetInfoText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.emerald700,
  },
  sheetInfoBold: {
    fontFamily: Typography.fontFamilyBold,
  },
  generateBtn: {
    backgroundColor: Colors.emerald600,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  generateBtnDisabled: {
    opacity: 0.5,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  generateBtnText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  infoSectionHeader: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.emerald50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate900,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  celebrationCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.lg,
  },
  successIconBox: {
    marginBottom: Spacing.sm,
  },
  celebrationTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    marginBottom: 4,
  },
  celebrationSubtitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    color: Colors.slate600,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  celebrationBatchId: {
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
  },
  celebrationDetails: {
    width: '100%',
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: 8,
  },
  celebrationDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  celebrationDetailText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
  },
  celebrationActions: {
    width: '100%',
    gap: Spacing.sm,
  },
  modalActionPrimary: {
    backgroundColor: Colors.emerald600,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  modalActionPrimaryText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
    letterSpacing: 0.2,
  },
  modalActionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
  },
  modalActionSecondaryText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate700,
  },
  modalActionGhost: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  modalActionGhostText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate400,
  },
  modalActionDisabled: {
    opacity: 0.6,
  },
});

