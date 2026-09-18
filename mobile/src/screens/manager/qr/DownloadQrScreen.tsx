/**
 * GreenPath Village Manager — Download QR Codes Screen
 *
 * Implements:
 * - Live search by Batch ID and status filter chips (All, Has Unmapped, Fully Mapped)
 * - Visual progress bar per batch showing mapped percentage
 * - Dual direct actions per batch: "Share Unmapped" & "All"
 * - Physical sticker preview modal with live vector QR
 * - Conditional "Export All": only enabled if total unmapped <= 1,000
 * - Multi-Batch Selection Mode: when total unmapped > 1,000 or upon selecting batches,
 *   tracks real-time selected sticker count and enforces 1,000 sticker safety limit.
 * - 100% client-side vector PDF generation and native share sheet
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import {
  fetchManagerQrCodes,
  fetchManagerQrStats,
} from '../../../api/manager.api';
import {
  exportAndShareQrPdf,
} from '../../../services/qr-pdf-export.service';
import { QrCardPreviewModal } from './QrCardPreviewModal';
import type {
  ManagerVillageData,
  ManagerQrCodeRecord,
  ManagerQrStats,
  ManagerQrBatchGroup,
} from '../../../types/manager';

interface DownloadQrScreenProps {
  villageData?: ManagerVillageData | null;
  onBack: () => void;
  onNavigateToGenerate: () => void;
}

type BatchFilter = 'all' | 'unmapped' | 'mapped';

export function DownloadQrScreen({
  villageData,
  onBack,
  onNavigateToGenerate,
}: DownloadQrScreenProps) {
  const [qrCodes, setQrCodes] = useState<ManagerQrCodeRecord[]>([]);
  const [stats, setStats] = useState<ManagerQrStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<BatchFilter>('all');

  // Multi-batch selection state
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

  // Preview Modal State
  const [previewUid, setPreviewUid] = useState<string | null>(null);
  const [previewBatchId, setPreviewBatchId] = useState<string | null>(null);

  // PDF Export Generation State
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatusText, setExportStatusText] = useState('Generating A4 Sticker Sheets...');

  const unitType = (villageData as any)?.unitType;

  const loadData = useCallback(async () => {
    try {
      const [codesList, statsData] = await Promise.all([
        fetchManagerQrCodes(),
        fetchManagerQrStats(),
      ]);
      setQrCodes(codesList);
      setStats(statsData);
    } catch (err) {
      console.warn('[DownloadQrScreen] Failed to load QR codes:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRefreshing(true);
    loadData();
  };

  // Group raw QR codes by batchId
  const batchGroups: ManagerQrBatchGroup[] = useMemo(() => {
    const map: Record<string, ManagerQrBatchGroup> = {};

    for (const qr of qrCodes) {
      const bId = qr.batchId || 'Default';
      if (!map[bId]) {
        map[bId] = {
          batchId: bId,
          total: 0,
          mapped: 0,
          unmapped: 0,
          qrCodes: [],
          createdAt: qr.createdAt,
        };
      }
      map[bId].total++;
      if (qr.status === 'mapped') {
        map[bId].mapped++;
      } else {
        map[bId].unmapped++;
      }
      map[bId].qrCodes.push(qr);
    }

    return Object.values(map).sort((a, b) => b.batchId.localeCompare(a.batchId));
  }, [qrCodes]);

  // Filtered batches
  const filteredBatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return batchGroups.filter((b) => {
      const matchesSearch = query === '' || b.batchId.toLowerCase().includes(query);
      if (!matchesSearch) return false;

      if (filterType === 'unmapped') return b.unmapped > 0;
      if (filterType === 'mapped') return b.unmapped === 0;
      return true;
    });
  }, [batchGroups, searchQuery, filterType]);

  // Total unmapped count across all batches
  const totalUnmappedCount = useMemo(() => {
    return batchGroups.reduce((acc, b) => acc + b.unmapped, 0);
  }, [batchGroups]);

  // Derived metrics for selected batches
  const selectedBatches = useMemo(() => {
    return batchGroups.filter((b) => selectedBatchIds.includes(b.batchId));
  }, [batchGroups, selectedBatchIds]);

  const selectedUnmappedCount = useMemo(() => {
    return selectedBatches.reduce((acc, b) => acc + b.unmapped, 0);
  }, [selectedBatches]);

  const isSelectionOverLimit = selectedUnmappedCount > 1000;
  const selectedSheetsCount = Math.ceil(selectedUnmappedCount / 9);

  // Toggle selection for a batch
  const toggleBatchSelection = (batchId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBatchIds((prev) =>
      prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]
    );
  };

  const clearSelection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBatchIds([]);
  };

  // Handle sharing unmapped codes for a single specific batch
  const handleShareBatchUnmapped = async (batch: ManagerQrBatchGroup) => {
    const unmappedItems = batch.qrCodes.filter((qr) => qr.status !== 'mapped');
    if (unmappedItems.length === 0) {
      Alert.alert('All Mapped', 'All QR codes in this batch are already mapped to households.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsExporting(true);
      setExportStatusText(`Rendering ${unmappedItems.length} Unmapped Stickers for ${batch.batchId}...`);

      await exportAndShareQrPdf({
        items: unmappedItems,
        title: `${batch.batchId}_Unmapped`,
        unitType,
        villageName: villageData?.name,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Failed to export sticker sheet.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle sharing ALL codes for a specific batch
  const handleShareBatchAll = async (batch: ManagerQrBatchGroup) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsExporting(true);
      setExportStatusText(`Rendering all ${batch.total} Stickers for ${batch.batchId}...`);

      await exportAndShareQrPdf({
        items: batch.qrCodes,
        title: `${batch.batchId}_All`,
        unitType,
        villageName: villageData?.name,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Failed to export sticker sheet.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle sharing SELECTED batches (when user selects batches)
  const handleShareSelectedBatches = async () => {
    if (selectedBatches.length === 0 || isSelectionOverLimit) return;

    const unmappedCodes = selectedBatches.flatMap((b) =>
      b.qrCodes.filter((qr) => qr.status !== 'mapped')
    );

    if (unmappedCodes.length === 0) {
      Alert.alert('All Mapped', 'The selected batches contain no unmapped QR codes.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setIsExporting(true);
      setExportStatusText(
        `Rendering ${unmappedCodes.length} Stickers across ${selectedBatches.length} Batches...`
      );

      await exportAndShareQrPdf({
        items: unmappedCodes,
        title: `Selected_${selectedBatches.length}_Batches_${unmappedCodes.length}_QR`,
        unitType,
        villageName: villageData?.name,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Failed to export selected batches.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle sharing ALL unmapped codes across the entire village (ONLY when <= 1000)
  const handleShareAllUnmappedVillage = async () => {
    const allUnmapped = qrCodes.filter((qr) => qr.status !== 'mapped');
    if (allUnmapped.length === 0) {
      Alert.alert('All Mapped', 'There are no unmapped QR codes in this village.');
      return;
    }

    if (allUnmapped.length > 1000) {
      Alert.alert(
        'Batch Limit Exceeded',
        `Village has ${allUnmapped.length} unmapped codes. To prevent device memory crashes, please select batches up to 1,000 codes to print.`
      );
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setIsExporting(true);
      setExportStatusText(
        `Rendering all ${allUnmapped.length} Unmapped Stickers for ${villageData?.name || 'Village'}...`
      );

      await exportAndShareQrPdf({
        items: allUnmapped,
        title: `All_Unmapped_QR_Codes`,
        unitType,
        villageName: villageData?.name,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Failed to export all unmapped stickers.');
    } finally {
      setIsExporting(false);
    }
  };

  const openPreview = (batch: ManagerQrBatchGroup) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const firstUid = batch.qrCodes[0]?.uid || '';
    setPreviewUid(firstUid);
    setPreviewBatchId(batch.batchId);
  };

  const hasSelection = selectedBatchIds.length > 0;
  const canShowExportAll = !hasSelection && totalUnmappedCount > 0 && totalUnmappedCount <= 1000;
  const showStickyFooter = hasSelection || canShowExportAll;

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
          <Text style={styles.headerTitle}>QR Code Batches</Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onNavigateToGenerate();
          }}
          style={styles.headerActionBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={18} color={Colors.emerald700} />
          <Text style={styles.headerActionText}>New Batch</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter Header */}
      <View style={styles.filterSection}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color={Colors.slate400} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search batches by ID..."
            placeholderTextColor={Colors.slate400}
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={Colors.slate400} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips & Selection indicator */}
        <View style={styles.filterRow}>
          <View style={styles.filterChipsRow}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilterType('all');
              }}
              style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>
                All ({batchGroups.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilterType('unmapped');
              }}
              style={[styles.filterChip, filterType === 'unmapped' && styles.filterChipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, filterType === 'unmapped' && styles.filterChipTextActive]}>
                Has Unmapped ({batchGroups.filter((b) => b.unmapped > 0).length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilterType('mapped');
              }}
              style={[styles.filterChip, filterType === 'mapped' && styles.filterChipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, filterType === 'mapped' && styles.filterChipTextActive]}>
                Fully Mapped ({batchGroups.filter((b) => b.unmapped === 0).length})
              </Text>
            </TouchableOpacity>
          </View>

          {hasSelection && (
            <TouchableOpacity onPress={clearSelection} style={styles.clearHeaderBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={14} color={Colors.slate600} />
              <Text style={styles.clearHeaderText}>Clear ({selectedBatchIds.length})</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Batch List */}
      {isLoading ? (
        <View style={styles.centerLoadingBox}>
          <ActivityIndicator size="large" color={Colors.emerald600} />
          <Text style={styles.loadingSubtext}>Loading QR code batches...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBatches}
          keyExtractor={(item) => item.batchId}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.emerald600}
              colors={[Colors.emerald600]}
            />
          }
          contentContainerStyle={[
            styles.listContainer,
            showStickyFooter && styles.listContainerWithSticky,
          ]}
          ListHeaderComponent={
            totalUnmappedCount > 1000 ? (
              <View style={styles.largeVillageNotice}>
                <Ionicons name="shield-checkmark-outline" size={20} color={Colors.blue600} />
                <View style={styles.largeVillageNoticeContent}>
                  <Text style={styles.largeVillageNoticeTitle}>
                    Large Village ({totalUnmappedCount} Unmapped Codes)
                  </Text>
                  <Text style={styles.largeVillageNoticeDesc}>
                    To prevent phone memory crashes and printer overflow, "Export All" is limited to 1,000 stickers. Select specific batches below to bundle and export up to 1,000 stickers.
                  </Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="qr-code-outline" size={44} color={Colors.slate300} />
              </View>
              <Text style={styles.emptyTitle}>No QR Batches Found</Text>
              <Text style={styles.emptyDescription}>
                {searchQuery
                  ? `No batches matching "${searchQuery}". Try clearing search.`
                  : 'Generate your first batch of QR codes to export printable sticker sheets for field workers.'}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onNavigateToGenerate();
                }}
                style={styles.emptyActionBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
                <Text style={styles.emptyActionText}>Generate First Batch</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: batch }) => {
            const mappedPercentage = batch.total > 0 ? (batch.mapped / batch.total) * 100 : 0;
            const isFullyMapped = batch.unmapped === 0;
            const isSelected = selectedBatchIds.includes(batch.batchId);

            return (
              <View style={[styles.batchCard, isSelected && styles.batchCardSelected]}>
                {/* Status Indicator Strip */}
                <View
                  style={[
                    styles.batchStrip,
                    { backgroundColor: isFullyMapped ? Colors.emerald500 : Colors.blue600 },
                  ]}
                />

                <View style={styles.batchContent}>
                  {/* Top Row: Checkbox, Batch ID & Preview */}
                  <View style={styles.batchHeaderRow}>
                    <TouchableOpacity
                      onPress={() => toggleBatchSelection(batch.batchId)}
                      style={styles.checkboxTouch}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel={`Select batch ${batch.batchId}`}
                    >
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={21}
                        color={isSelected ? Colors.emerald600 : Colors.slate400}
                      />
                    </TouchableOpacity>

                    <View style={styles.batchIdBox}>
                      <Text style={styles.batchIdText}>{batch.batchId}</Text>
                      <Text style={styles.batchSubtext}>
                        {batch.total} Total Stickers • {Math.ceil(batch.total / 9)} A4 Sheets
                      </Text>
                    </View>

                    {/* Preview Eye Button */}
                    <TouchableOpacity
                      onPress={() => openPreview(batch)}
                      style={styles.previewIconBtn}
                      activeOpacity={0.7}
                      accessibilityLabel="Preview sticker card"
                    >
                      <Ionicons name="eye-outline" size={17} color={Colors.slate600} />
                    </TouchableOpacity>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressLabels}>
                      <Text style={styles.progressLabelLeft}>
                        {batch.mapped} / {batch.total} Mapped ({Math.round(mappedPercentage)}%)
                      </Text>
                      <Text
                        style={[
                          styles.progressLabelRight,
                          batch.unmapped > 0 ? { color: Colors.amber600 } : { color: Colors.emerald700 },
                        ]}
                      >
                        {batch.unmapped > 0 ? `${batch.unmapped} to map` : '100% Complete'}
                      </Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${mappedPercentage}%`,
                            backgroundColor: isFullyMapped ? Colors.emerald500 : Colors.blue500,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Badges Row */}
                  <View style={styles.badgesRow}>
                    <View style={styles.badgeItem}>
                      <Text style={styles.badgeItemText}>{batch.total} total</Text>
                    </View>
                    <View style={[styles.badgeItem, styles.badgeMapped]}>
                      <Text style={[styles.badgeItemText, styles.badgeMappedText]}>
                        {batch.mapped} mapped
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badgeItem,
                        batch.unmapped > 0 ? styles.badgeUnmapped : styles.badgeMuted,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeItemText,
                          batch.unmapped > 0 ? styles.badgeUnmappedText : styles.badgeMutedText,
                        ]}
                      >
                        {batch.unmapped} unmapped
                      </Text>
                    </View>
                  </View>

                  {/* Actions Row: Share Unmapped vs All */}
                  <View style={styles.batchActionsRow}>
                    <TouchableOpacity
                      onPress={() => handleShareBatchUnmapped(batch)}
                      disabled={batch.unmapped === 0}
                      style={[
                        styles.batchPrimaryBtn,
                        batch.unmapped === 0 && styles.batchPrimaryBtnDisabled,
                      ]}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="print-outline" size={15} color="#ffffff" />
                      <Text style={styles.batchPrimaryBtnText}>
                        Print Unmapped ({batch.unmapped})
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Sticky Bottom Bar */}
      {!isLoading && showStickyFooter && (
        <View style={styles.stickyFooterBar}>
          {hasSelection ? (
            /* Mode 1: Selected Batches */
            <View style={styles.selectionFooterWrap}>
              <View style={styles.selectionInfoRow}>
                <View style={styles.selectionCountWrap}>
                  <Ionicons name="checkmark-circle" size={16} color={isSelectionOverLimit ? Colors.destructive : Colors.emerald600} />
                  <Text style={styles.selectionCountText}>
                    {selectedBatchIds.length} Batch{selectedBatchIds.length > 1 ? 'es' : ''} Selected:{' '}
                    <Text style={isSelectionOverLimit ? styles.selectionCountDanger : styles.selectionCountBold}>
                      {selectedUnmappedCount} Unmapped
                    </Text>{' '}
                    ({selectedSheetsCount} Pages)
                  </Text>
                </View>

                <TouchableOpacity onPress={clearSelection} style={styles.clearSelectionBtn} activeOpacity={0.7}>
                  <Text style={styles.clearSelectionText}>Deselect</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleShareSelectedBatches}
                disabled={isExporting || isSelectionOverLimit || selectedUnmappedCount === 0}
                style={[
                  styles.stickyExportBtn,
                  (isSelectionOverLimit || selectedUnmappedCount === 0) && styles.stickyExportBtnDisabled,
                ]}
                activeOpacity={0.8}
              >
                <View style={styles.stickyBtnRow}>
                  <Ionicons
                    name={isSelectionOverLimit ? 'alert-circle-outline' : 'print-outline'}
                    size={18}
                    color="#ffffff"
                  />
                  <Text style={styles.stickyExportBtnText}>
                    {isSelectionOverLimit
                      ? `Exceeds 1,000 Limit (${selectedUnmappedCount}) — Deselect Batch`
                      : selectedUnmappedCount === 0
                        ? 'Selected Batches Have 0 Unmapped'
                        : `Export Selected (${selectedUnmappedCount} Stickers)`}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            /* Mode 2: Export All Unmapped (Only when totalUnmappedCount <= 1000) */
            <TouchableOpacity
              onPress={handleShareAllUnmappedVillage}
              disabled={isExporting}
              style={styles.stickyExportBtn}
              activeOpacity={0.8}
            >
              <View style={styles.stickyBtnRow}>
                <Ionicons name="download-outline" size={18} color="#ffffff" />
                <Text style={styles.stickyExportBtnText}>
                  Export All Unmapped QR Codes ({totalUnmappedCount})
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Sticker Preview Modal */}
      {previewUid && (
        <QrCardPreviewModal
          visible={previewUid !== null}
          uid={previewUid}
          batchId={previewBatchId || undefined}
          unitType={unitType}
          onClose={() => setPreviewUid(null)}
          onShareBatch={() => {
            const currentBatch = batchGroups.find((b) => b.batchId === previewBatchId);
            if (currentBatch) {
              setPreviewUid(null);
              handleShareBatchUnmapped(currentBatch);
            }
          }}
        />
      )}

      {/* Export Generation Progress Overlay */}
      <Modal visible={isExporting} transparent animationType="fade">
        <View style={styles.exportProgressOverlay}>
          <View style={styles.exportProgressCard}>
            <ActivityIndicator size="large" color={Colors.emerald600} />
            <Text style={styles.exportProgressTitle}>Generating A4 Sticker Sheet</Text>
            <Text style={styles.exportProgressDesc}>{exportStatusText}</Text>
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
    gap: 3,
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
  filterSection: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
    gap: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm + 2,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    color: Colors.slate900,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
  },
  filterChipActive: {
    backgroundColor: Colors.slate900,
  },
  filterChipText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
  },
  filterChipTextActive: {
    color: Colors.white,
    fontFamily: Typography.fontFamilyBold,
  },
  clearHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  clearHeaderText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate700,
  },
  listContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl + 20,
    gap: Spacing.md,
  },
  listContainerWithSticky: {
    paddingBottom: Spacing.xxl + 85,
  },
  largeVillageNotice: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: '#eff6ff',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: Spacing.sm,
  },
  largeVillageNoticeContent: {
    flex: 1,
  },
  largeVillageNoticeTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.blue600,
    marginBottom: 2,
  },
  largeVillageNoticeDesc: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate600,
    lineHeight: 16,
  },
  centerLoadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingSubtext: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
  },
  batchCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  batchCardSelected: {
    borderColor: Colors.emerald500,
    backgroundColor: '#f0fdf4',
  },
  batchStrip: {
    width: 4,
  },
  batchContent: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  batchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  checkboxTouch: {
    padding: 2,
  },
  batchIdBox: {
    flex: 1,
  },
  batchIdText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    letterSpacing: -0.2,
  },
  batchSubtext: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    marginTop: 2,
  },
  previewIconBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    gap: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelLeft: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate700,
  },
  progressLabelRight: {
    fontSize: 11,
    fontFamily: Typography.fontFamilySemiBold,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badgeItem: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.slate100,
  },
  badgeItemText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
  },
  badgeMapped: {
    backgroundColor: Colors.emerald50,
  },
  badgeMappedText: {
    color: Colors.emerald700,
    fontFamily: Typography.fontFamilySemiBold,
  },
  badgeUnmapped: {
    backgroundColor: '#fffbeb',
  },
  badgeUnmappedText: {
    color: Colors.amber600,
    fontFamily: Typography.fontFamilySemiBold,
  },
  badgeMuted: {
    backgroundColor: Colors.slate50,
  },
  badgeMutedText: {
    color: Colors.slate400,
  },
  batchActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 4,
  },
  batchOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.lg,
    borderColor: Colors.slate200,
    backgroundColor: Colors.white,
  },
  batchOutlineBtnText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate700,
  },
  batchPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.emerald600,
    ...Shadows.sm,
  },
  batchPrimaryBtnDisabled: {
    opacity: 0.4,
    backgroundColor: Colors.slate300,
  },
  batchPrimaryBtnText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
  stickyFooterBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: Colors.slate200,
    ...Shadows.md,
  },
  selectionFooterWrap: {
    gap: Spacing.xs + 2,
  },
  selectionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  selectionCountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  selectionCountText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate700,
  },
  selectionCountBold: {
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
  },
  selectionCountDanger: {
    fontFamily: Typography.fontFamilyBold,
    color: Colors.destructive,
  },
  clearSelectionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  clearSelectionText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate500,
  },
  stickyExportBtn: {
    backgroundColor: Colors.emerald600,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  stickyExportBtnDisabled: {
    backgroundColor: Colors.slate400,
    opacity: 0.7,
  },
  stickyBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  stickyExportBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
    letterSpacing: 0.2,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.slate100,
    marginTop: Spacing.xl,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate800,
    marginBottom: 4,
  },
  emptyDescription: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.emerald600,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    ...Shadows.sm,
  },
  emptyActionText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
  exportProgressOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  exportProgressCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.lg,
  },
  exportProgressTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    marginTop: Spacing.xs,
  },
  exportProgressDesc: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    textAlign: 'center',
  },
  clientTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.emerald50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  clientTagText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.emerald700,
  },
});
