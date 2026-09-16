/**
 * GreenPath Village Manager — Tab 2: Collections Filter Modal
 *
 * Right-side slide-over drawer modal:
 * - Group 1: Status (All, Collected, Pending, Missed)
 * - Group 2: Ward (All, dynamic ward list from village households)
 * - Group 3: Segregation Rating (All, <=1, <=2, <=3, <=4, =5)
 * - Sticky bottom bar with 'Clear All' and 'Apply Filters'
 */
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';

export type CollectionsRatingFilter =
  | 'all'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '<=1'
  | '<=2'
  | '<=3'
  | '<=4'
  | '=5';

export interface CollectionsFilterState {
  status: 'all' | 'collected' | 'pending' | 'missed';
  ward: string; // 'all' or ward name
  rating: CollectionsRatingFilter;
}

export const DEFAULT_COLLECTIONS_FILTERS: CollectionsFilterState = {
  status: 'all',
  ward: 'all',
  rating: 'all',
};

interface CollectionsFilterModalProps {
  visible: boolean;
  filters: CollectionsFilterState;
  availableWards: string[];
  onApply: (filters: CollectionsFilterState) => void;
  onClose: () => void;
}

export function CollectionsFilterModal({
  visible,
  filters,
  availableWards,
  onApply,
  onClose,
}: CollectionsFilterModalProps) {
  const [draftFilters, setDraftFilters] = useState<CollectionsFilterState>(filters);

  // Sync draft filters with active filters when opened
  useEffect(() => {
    if (visible) {
      setDraftFilters(filters);
    }
  }, [visible, filters]);

  const activeCount =
    (draftFilters.status !== 'all' ? 1 : 0) +
    (draftFilters.ward !== 'all' ? 1 : 0) +
    (draftFilters.rating !== 'all' ? 1 : 0);

  const handleClearAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDraftFilters(DEFAULT_COLLECTIONS_FILTERS);
  };

  const handleApply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onApply(draftFilters);
    onClose();
  };

  const statusOptions = [
    { id: 'all' as const, label: 'All Statuses' },
    { id: 'collected' as const, label: 'Collected' },
    { id: 'pending' as const, label: 'Pending' },
    { id: 'missed' as const, label: 'Missed' },
  ];

  const exactRatingOptions: Array<{ id: CollectionsRatingFilter; label: string }> = [
    { id: '1', label: '★ 1 (Poor)' },
    { id: '2', label: '★ 2 (Low)' },
    { id: '3', label: '★ 3 (Moderate)' },
    { id: '4', label: '★ 4 (Good)' },
    { id: '5', label: '★ 5 (Clean)' },
  ];

  const thresholdRatingOptions: Array<{ id: CollectionsRatingFilter; label: string }> = [
    { id: '<=1', label: '★ ≤ 1 (Severe)' },
    { id: '<=2', label: '★ ≤ 2 (Poor & Below)' },
    { id: '<=3', label: '★ ≤ 3 (Critical & Below)' },
    { id: '<=4', label: '★ ≤ 4 (Moderate & Below)' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop dismiss */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Right Slide-over Sheet */}
        <View style={styles.drawerSheet}>
          <SafeAreaView style={styles.drawerSafeArea}>
            {/* Header */}
            <View style={styles.drawerHeader}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="funnel-outline" size={18} color={Colors.slate900} />
                <Text style={styles.headerTitle}>Filters</Text>
                {activeCount > 0 ? (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>{activeCount} active</Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={Colors.slate700} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Filter Groups */}
            <ScrollView
              style={styles.drawerScroll}
              contentContainerStyle={styles.drawerScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Group 1: Status */}
              <View style={styles.filterGroup}>
                <Text style={styles.groupLabel}>Collection Status</Text>
                <View style={styles.chipsWrap}>
                  {statusOptions.map((opt) => {
                    const isSelected = draftFilters.status === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setDraftFilters((prev) => ({ ...prev, status: opt.id }));
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            isSelected && styles.filterChipTextSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Group 2: Ward */}
              <View style={styles.filterGroup}>
                <Text style={styles.groupLabel}>Ward</Text>
                <View style={styles.chipsWrap}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      draftFilters.ward === 'all' && styles.filterChipSelected,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setDraftFilters((prev) => ({ ...prev, ward: 'all' }));
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        draftFilters.ward === 'all' && styles.filterChipTextSelected,
                      ]}
                    >
                      All Wards
                    </Text>
                  </TouchableOpacity>

                  {availableWards.map((w) => {
                    const isSelected = draftFilters.ward.toLowerCase() === w.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={w}
                        style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setDraftFilters((prev) => ({ ...prev, ward: w }));
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            isSelected && styles.filterChipTextSelected,
                          ]}
                        >
                          {w}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Group 3: Segregation Rating */}
              <View style={styles.filterGroup}>
                <Text style={styles.groupLabel}>Segregation Rating</Text>

                {/* All Ratings option */}
                <View style={styles.chipsWrap}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      draftFilters.rating === 'all' && styles.filterChipSelected,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setDraftFilters((prev) => ({ ...prev, rating: 'all' }));
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        draftFilters.rating === 'all' && styles.filterChipTextSelected,
                      ]}
                    >
                      All Ratings
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Exact Star Rating */}
                <Text style={styles.subGroupLabel}>Exact Rating</Text>
                <View style={styles.chipsWrap}>
                  {exactRatingOptions.map((opt) => {
                    const isSelected =
                      draftFilters.rating === opt.id ||
                      (opt.id === '5' && draftFilters.rating === '=5');
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setDraftFilters((prev) => ({ ...prev, rating: opt.id }));
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            isSelected && styles.filterChipTextSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Cumulative Threshold */}
                <Text style={styles.subGroupLabel}>Threshold (Up To)</Text>
                <View style={styles.chipsWrap}>
                  {thresholdRatingOptions.map((opt) => {
                    const isSelected = draftFilters.rating === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setDraftFilters((prev) => ({ ...prev, rating: opt.id }));
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            isSelected && styles.filterChipTextSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Bottom Sticky Action Bar */}
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClearAll}
                activeOpacity={0.7}
              >
                <Text style={styles.clearBtnText}>Clear All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.applyBtn}
                onPress={handleApply}
                activeOpacity={0.8}
              >
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  drawerSheet: {
    width: '84%',
    maxWidth: 340,
    backgroundColor: Colors.white,
    height: '100%',
    ...Shadows.lg,
  },
  drawerSafeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  activePill: {
    backgroundColor: Colors.emerald50,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  activePillText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerScroll: {
    flex: 1,
  },
  drawerScrollContent: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  filterGroup: {
    gap: Spacing.sm,
  },
  groupLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subGroupLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.xs + 2,
    marginBottom: 2,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.slate100,
    borderWidth: 1,
    borderColor: Colors.transparent,
  },
  filterChipSelected: {
    backgroundColor: Colors.emerald700,
    borderColor: Colors.emerald700,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate700,
  },
  filterChipTextSelected: {
    color: Colors.white,
    fontFamily: Typography.fontFamilyBold,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    backgroundColor: Colors.white,
  },
  clearBtn: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate700,
  },
  applyBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.emerald700,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  applyBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
});
