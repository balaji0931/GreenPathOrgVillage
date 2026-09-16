/**
 * GreenPath Village Manager — Tab 2: Live Collections Screen
 *
 * Full fidelity implementation matching web application mobile dashboard:
 * - Pinned DateNavBar with DatePickerModal and day stepper
 * - Story-style horizontal Needs Attention strip (rating <= 3)
 * - Attention Detail Sheet with photo proof, voice note player, call & visit actions
 * - Focused Search View with real-time filter across head name, house #, and UID
 * - Village Members list with status indicators (Collected / Pending) and collector attribution
 * - Collection History Detail View with aggregate KPI cards and paginated timeline
 * - Media popup for photo proof and voice note playback
 * - Single-day SQLite L2 / Memory L1 cache for instant 0ms tab switching
 * - Full pull-to-refresh support
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { fetchManagerDailySummary, fetchManagerWards } from '../../api/manager.api';
import { useAuth } from '../../auth/AuthProvider';
import {
  getCachedCollectionsSummary,
  saveCachedCollectionsSummary,
  isTodayDate,
  getTodayDateStr,
  purgeOldReportsCache,
} from '../../services/manager-cache';
import { ReportsDateSwitcher } from './reports';
import {
  CollectionsNeedsAttentionStrip,
  CollectionsAttentionModal,
  CollectionsHouseholdRow,
  CollectionsSearchView,
  CollectionDetailView,
  CollectionsFilterModal,
  type CollectionsFilterState,
  DEFAULT_COLLECTIONS_FILTERS,
} from './collections';
import type {
  ManagerVillageData,
  ManagerCollectionHousehold,
  ManagerAttentionHousehold,
  ManagerDailyCollectionSummary,
} from '../../types/manager';

/**
 * Normalizes and compares household ward string to the selected filter ward.
 * Handles discrepancies such as "Ward 1", "ward 1", "Ward-1", "1", "Ward 01".
 */
function matchesWard(householdWard: string, filterWard: string): boolean {
  if (!filterWard || filterWard === 'all') return true;
  const hw = (householdWard || '').trim().toLowerCase();
  const fw = filterWard.trim().toLowerCase();
  if (!hw) return false;
  if (hw === fw) return true;

  // Extract digits for number-based matching (e.g., "Ward 1" vs "1" or "Ward-1")
  const hwDigits = hw.match(/\d+/g)?.join('');
  const fwDigits = fw.match(/\d+/g)?.join('');
  if (hwDigits && fwDigits) {
    return parseInt(hwDigits, 10) === parseInt(fwDigits, 10);
  }

  return false;
}

interface ManagerCollectionsScreenProps {
  villageData?: ManagerVillageData | null;
  isActive?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onNeedsAttentionCountChange?: (count: number) => void;
}

export function ManagerCollectionsScreen({
  villageData,
  isActive = true,
  isRefreshing = false,
  onRefresh,
  onNeedsAttentionCountChange,
}: ManagerCollectionsScreenProps) {
  const { user } = useAuth();
  const effectiveVillageId = (villageData?.id || user?.villageId || '').trim();

  // Official village wards (strictly configured in village settings)
  const [villageWards, setVillageWards] = useState<string[]>(() => {
    return Array.isArray(villageData?.wards) && villageData.wards.length > 0
      ? villageData.wards
      : [];
  });

  // Selected date state (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr);

  // Synchronous cache initialization for 0ms initial load
  const [dailySummary, setDailySummary] = useState<ManagerDailyCollectionSummary | null>(() => {
    return getCachedCollectionsSummary(effectiveVillageId, getTodayDateStr());
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const cached = getCachedCollectionsSummary(effectiveVillageId, getTodayDateStr());
    return !cached;
  });

  const [householdsLimit, setHouseholdsLimit] = useState<number>(25);
  const [localRefreshing, setLocalRefreshing] = useState<boolean>(false);

  // Navigation states within Collections tab
  const [selectedCollectionHousehold, setSelectedCollectionHousehold] =
    useState<ManagerCollectionHousehold | null>(null);
  const [selectedAttentionHousehold, setSelectedAttentionHousehold] =
    useState<ManagerAttentionHousehold | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Filter drawer modal state
  const [filters, setFilters] = useState<CollectionsFilterState>(DEFAULT_COLLECTIONS_FILTERS);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);

  // Fetch official village wards from API
  useEffect(() => {
    if (!effectiveVillageId) return;
    let isMounted = true;
    fetchManagerWards(effectiveVillageId)
      .then((wards) => {
        if (isMounted && Array.isArray(wards) && wards.length > 0) {
          setVillageWards(wards);
        }
      })
      .catch((err) => {
        console.warn('[ManagerCollectionsScreen] Failed to fetch official village wards:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [effectiveVillageId]);

  // Purge old cache on mount
  useEffect(() => {
    purgeOldReportsCache();
  }, []);

  // Fetch summary data
  const loadDailySummary = useCallback(
    async (dateStr: string, isPullRefresh = false) => {
      if (!effectiveVillageId) return;

      if (isPullRefresh) {
        setLocalRefreshing(true);
      } else {
        // If today and cached, load from cache first
        const cached = getCachedCollectionsSummary(effectiveVillageId, dateStr);
        if (cached) {
          setDailySummary(cached);
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }
      }

      try {
        const data = await fetchManagerDailySummary(dateStr);
        if (data) {
          setDailySummary(data);
          if (isTodayDate(dateStr)) {
            saveCachedCollectionsSummary(effectiveVillageId, dateStr, data);
          }
        }
      } catch (err) {
        console.warn('[ManagerCollectionsScreen] Failed to fetch daily summary:', err);
      } finally {
        setIsLoading(false);
        setLocalRefreshing(false);
      }
    },
    [effectiveVillageId]
  );

  // Fetch when active or date changes
  useEffect(() => {
    if (isActive && effectiveVillageId) {
      loadDailySummary(selectedDate, false);
    }
  }, [isActive, effectiveVillageId, selectedDate, loadDailySummary]);

  // Notify parent dashboard of today's needs attention count
  useEffect(() => {
    if (isTodayDate(selectedDate) && dailySummary?.needsAttention) {
      onNeedsAttentionCountChange?.(dailySummary.needsAttention.length);
    }
  }, [selectedDate, dailySummary, onNeedsAttentionCountChange]);

  // Handle pull to refresh
  const handlePullRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onRefresh) {
      onRefresh();
    }
    loadDailySummary(selectedDate, true);
  };

  // Extract dynamic list of distinct wards: strictly prioritize official village wards
  const availableWards = useMemo(() => {
    if (villageWards.length > 0) {
      return villageWards;
    }
    // Fallback: extract distinct clean wards from households if API list unavailable
    const set = new Set<string>();
    (dailySummary?.households || []).forEach((h) => {
      if (h.ward && h.ward.trim()) {
        set.add(h.ward.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [villageWards, dailySummary]);

  // Count active filters
  const activeFilterCount =
    (filters.status !== 'all' ? 1 : 0) +
    (filters.ward !== 'all' ? 1 : 0) +
    (filters.rating !== 'all' ? 1 : 0);

  // Filter households by status, ward, and rating
  const filteredHouseholds = useMemo(() => {
    const list = dailySummary?.households || [];
    return list.filter((h) => {
      if (filters.status === 'collected' && !h.collected) return false;
      if (filters.status === 'pending' && h.collected) return false;
      if (filters.status === 'missed' && h.collected) return false;

      if (filters.ward !== 'all' && !matchesWard(h.ward, filters.ward)) {
        return false;
      }

      if (filters.rating !== 'all') {
        if (!h.collected) return false;
        const r = h.segregationRating ?? 0;
        if (r <= 0) return false;

        // Cumulative threshold matching (<=)
        if (filters.rating === '<=1' && r > 1) return false;
        if (filters.rating === '<=2' && r > 2) return false;
        if (filters.rating === '<=3' && r > 3) return false;
        if (filters.rating === '<=4' && r > 4) return false;

        // Exact rating matching (1, 2, 3, 4, 5)
        if (filters.rating === '1' && Math.round(r) !== 1) return false;
        if (filters.rating === '2' && Math.round(r) !== 2) return false;
        if (filters.rating === '3' && Math.round(r) !== 3) return false;
        if (filters.rating === '4' && Math.round(r) !== 4) return false;
        if ((filters.rating === '5' || filters.rating === '=5') && Math.round(r) !== 5) return false;
      }

      return true;
    });
  }, [dailySummary, filters]);

  const displayedHouseholds = filteredHouseholds.slice(0, householdsLimit);
  const hasMoreHouseholds = filteredHouseholds.length > householdsLimit;

  // Filter trigger button rendered beside date in ReportsDateSwitcher
  const filterButton = (
    <TouchableOpacity
      style={[
        styles.filterTriggerBtn,
        activeFilterCount > 0 && styles.filterTriggerBtnActive,
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsFilterModalOpen(true);
      }}
      activeOpacity={0.7}
    >
      <Ionicons
        name={activeFilterCount > 0 ? 'funnel' : 'funnel-outline'}
        size={17}
        color={activeFilterCount > 0 ? Colors.emerald700 : Colors.slate700}
      />
      {activeFilterCount > 0 ? (
        <View style={styles.filterBadge}>
          <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  // 1. If drill-down household history is open, render CollectionDetailView
  if (selectedCollectionHousehold) {
    return (
      <CollectionDetailView
        household={selectedCollectionHousehold}
        onBack={() => setSelectedCollectionHousehold(null)}
      />
    );
  }

  // 2. If focused search view is active, render CollectionsSearchView
  if (isSearching) {
    return (
      <CollectionsSearchView
        households={dailySummary?.households || []}
        onSelect={(household) => setSelectedCollectionHousehold(household)}
        onBack={() => setIsSearching(false)}
      />
    );
  }

  // 3. Main Collections feed
  return (
    <View style={styles.container}>
      {/* Sticky Date Switcher with filter button beside it */}
      <ReportsDateSwitcher
        date={selectedDate}
        onChangeDate={(newDate) => {
          setSelectedDate(newDate);
          setHouseholdsLimit(25); // Reset scroll limit on date switch
        }}
        rightAction={filterButton}
      />

      {/* Main Feed Content */}
      {isLoading && householdsLimit === 25 && !dailySummary ? (
        <View style={styles.syncContainer}>
          <ActivityIndicator size="large" color={Colors.slate900} />
          <Text style={styles.syncText}>Synchronizing Data</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={localRefreshing || isRefreshing}
              onRefresh={handlePullRefresh}
              colors={[Colors.emerald700]}
              tintColor={Colors.emerald700}
            />
          }
        >
          {/* Story-style Needs Attention Strip */}
          <CollectionsNeedsAttentionStrip
            items={dailySummary?.needsAttention || []}
            onSelect={(household) => setSelectedAttentionHousehold(household)}
          />

          {/* Village Members List Section */}
          <View style={styles.membersSection}>
            {/* Section Header with Active Filter Pill */}
            <View style={styles.membersHeaderRow}>
              <View style={styles.headerTitleGroup}>
                <Text style={styles.membersHeaderTitle}>Village Members</Text>
                {activeFilterCount > 0 ? (
                  <TouchableOpacity
                    style={styles.filterActiveChip}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFilters(DEFAULT_COLLECTIONS_FILTERS);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.filterActiveChipText}>
                      Filtered ({filteredHouseholds.length})
                    </Text>
                    <Ionicons name="close-circle" size={13} color={Colors.emerald700} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.searchPillBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsSearching(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.searchPillText}>Search</Text>
                <Ionicons name="search" size={13} color={Colors.slate500} />
              </TouchableOpacity>
            </View>

            {/* Household Rows */}
            {displayedHouseholds.map((household) => (
              <CollectionsHouseholdRow
                key={household.id}
                household={household}
                onSelect={(h) => setSelectedCollectionHousehold(h)}
              />
            ))}

            {/* Pagination / View More Button */}
            {hasMoreHouseholds ? (
              <View style={styles.viewMoreContainer}>
                <TouchableOpacity
                  style={styles.viewMoreBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setHouseholdsLimit((prev) => prev + 25);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.viewMoreText}>View More Members</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.slate600} />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Empty State when no households match filters or date */}
            {displayedHouseholds.length === 0 && !isLoading ? (
              <View style={styles.emptyMembersBox}>
                <View style={styles.emptyMembersIcon}>
                  <Ionicons
                    name={activeFilterCount > 0 ? 'funnel-outline' : 'people-outline'}
                    size={36}
                    color={Colors.slate300}
                  />
                </View>
                <Text style={styles.emptyMembersText}>
                  {activeFilterCount > 0
                    ? 'No members match the selected filters.'
                    : 'No members found for this village or date.'}
                </Text>
                {activeFilterCount > 0 ? (
                  <TouchableOpacity
                    style={styles.clearFilterLink}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFilters(DEFAULT_COLLECTIONS_FILTERS);
                    }}
                  >
                    <Text style={styles.clearFilterLinkText}>Clear Filters</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      {/* Floating Detail Sheet for Needs Attention */}
      <CollectionsAttentionModal
        household={selectedAttentionHousehold}
        onClose={() => setSelectedAttentionHousehold(null)}
      />

      {/* Right-side Slide-over Filter Drawer Modal */}
      <CollectionsFilterModal
        visible={isFilterModalOpen}
        filters={filters}
        availableWards={availableWards}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setHouseholdsLimit(25);
        }}
        onClose={() => setIsFilterModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  syncContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xxl,
  },
  syncText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  membersSection: {
    backgroundColor: Colors.white,
  },
  membersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate50,
  },
  membersHeaderTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  searchPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.slate100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
  },
  searchPillText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  viewMoreContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  viewMoreBtn: {
    width: '100%',
    height: 48,
    borderRadius: BorderRadius.xxl,
    backgroundColor: Colors.slate50,
    borderWidth: 1,
    borderColor: Colors.slate200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  viewMoreText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate600,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyMembersBox: {
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  emptyMembersIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyMembersText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
  },
  clearFilterLink: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.emerald50,
  },
  clearFilterLinkText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
  },
  filterTriggerBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterTriggerBtnActive: {
    backgroundColor: Colors.emerald50,
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.emerald700,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  filterBadgeText: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  filterActiveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.emerald50,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: BorderRadius.full,
  },
  filterActiveChipText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
  },
});
