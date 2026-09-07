/**
 * Collector Dashboard — Main Orchestrator
 *
 * Manages tab state, data fetching, QR scanner, collection workflow,
 * and sync engine lifecycle.
 */
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, TextInput, FlatList, RefreshControl, Alert, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { playSuccessSound } from '../../utils/audio';

// Components
import { CollectorHeader } from '../../components/collector/CollectorHeader';
import { BottomNav, type CollectorTab } from '../../components/collector/BottomNav';
import { StatsCards } from '../../components/collector/StatsCards';
import { HouseholdCard } from '../../components/collector/HouseholdCard';
import { CollectionModal } from '../../components/collector/CollectionModal';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { QRScannerModal } from '../../components/scanner/QRScannerModal';

// Screens
import { AnnouncementsScreen } from './AnnouncementsScreen';
import { ShiftScreen } from './ShiftScreen';
import { WasteLogScreen } from './WasteLogScreen';
import { CollectionDetailsModal, type CollectionRecordDetail } from '../../components/collector/CollectionDetailsModal';
import { ProfileScreen } from './ProfileScreen';
import { SyncQueueScreen } from './SyncQueueScreen';

// Hooks & services
import { useCollectorData } from '../../hooks/useCollectorData';
import { useNetwork } from '../../hooks/useNetwork';
import { initSyncEngine, stopSyncEngine, triggerSync, onSyncStatsChange } from '../../services/sync-engine';
import { hasLocalCollectionToday, getLocalCollectionForHousehold, type QueueStats } from '../../services/offline-queue';
import type { Household, ScanResult } from '../../types/collector';

const PAGE_SIZE = 50;

export function CollectorDashboard() {
  const [activeTab, setActiveTab] = useState<CollectorTab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const [showScanner, setShowScanner] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCollectionDetail, setSelectedCollectionDetail] = useState<CollectionRecordDetail | null>(null);
  const [detailHousehold, setDetailHousehold] = useState<Household | null>(null);
  const [syncStats, setSyncStats] = useState<QueueStats>({ total: 0, queued: 0, syncing: 0, confirmed: 0, failed: 0 });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    households,
    collections,
    villageData,
    stats,
    isLoading,
    refresh,
    recordCollectionOptimistic,
  } = useCollectorData();

  const { isConnected } = useNetwork();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Sync Engine Lifecycle ──────────────────────────────────────

  useEffect(() => {
    // Initialize sync engine on mount
    initSyncEngine();

    // Subscribe to stats changes for the sync badge
    const unsubscribe = onSyncStatsChange(setSyncStats);

    return () => {
      unsubscribe();
      stopSyncEngine();
    };
  }, []);

  // Trigger sync on network reconnect
  useEffect(() => {
    if (isConnected) {
      triggerSync();
    }
  }, [isConnected]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh(false);
    triggerSync();
    setIsRefreshing(false);
  }, [refresh]);

  // Check if household was already collected today (server + local SQLite)
  const isAlreadyCollectedToday = useCallback((household: Household): boolean => {
    const today = new Date().toDateString();
    const serverCollected = collections.some((c) => {
      const cDate = new Date(c.collectionDate || '').toDateString();
      return c.householdId === household.id && cDate === today;
    });
    if (serverCollected) return true;

    return hasLocalCollectionToday(household.uid);
  }, [collections]);

  // Get collection timestamp if collected today
  const getCollectionTime = useCallback((household: Household): string | undefined => {
    const today = new Date().toDateString();
    const c = collections.find((col) => {
      const cDate = new Date(col.collectionDate || '').toDateString();
      return col.householdId === household.id && cDate === today;
    });
    if (c && c.collectionDate) {
      try {
        return new Date(c.collectionDate).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      } catch {
        return undefined;
      }
    }
    return undefined;
  }, [collections]);

  // Handle household tap
  const handleHouseholdPress = useCallback((household: Household) => {
    if (isAlreadyCollectedToday(household)) {
      const today = new Date().toDateString();
      // 1. Check server collections
      const serverCol = collections.find((col) => {
        const cDate = new Date(col.collectionDate || '').toDateString();
        return col.householdId === household.id && cDate === today;
      });

      if (serverCol) {
        setDetailHousehold(household);
        setSelectedCollectionDetail({
          status: serverCol.status,
          collectionDate: serverCol.collectionDate,
          segregationRating: serverCol.segregationRating,
          wasteTypes: serverCol.wasteTypes ? (serverCol.wasteTypes as string[]) : [],
          weightKg: serverCol.weightKg,
          remarks: serverCol.remarks,
          photoUrl: serverCol.photoUrl,
          voiceUrl: serverCol.voiceUrl,
          missedReason: serverCol.missedReason,
        });
        setShowDetailsModal(true);
        return;
      }

      // 2. Check local offline queue
      const localCol = getLocalCollectionForHousehold(household.uid);
      if (localCol) {
        let wasteTypes: string[] = [];
        try {
          wasteTypes = JSON.parse(localCol.wasteTypes || '[]');
        } catch {
          wasteTypes = [];
        }
        setDetailHousehold(household);
        setSelectedCollectionDetail({
          status: localCol.status,
          collectionDate: localCol.collectionDate,
          segregationRating: localCol.segregationRating,
          wasteTypes,
          weightKg: localCol.weightKg,
          remarks: localCol.remarks,
          photoUrl: localCol.photoLocalPath,
          voiceUrl: localCol.voiceLocalPath,
          missedReason: localCol.missedReason,
        });
        setShowDetailsModal(true);
        return;
      }

      // 3. Fallback if collected in today's cache table
      setDetailHousehold(household);
      setSelectedCollectionDetail({
        status: 'collected',
        collectionDate: new Date().toISOString(),
        segregationRating: 0,
      });
      setShowDetailsModal(true);
    } else {
      setSelectedHousehold(household);
      setShowCollectionModal(true);
    }
  }, [isAlreadyCollectedToday, collections]);

  // Handle QR scan result
  const handleQRScan = useCallback((result: ScanResult) => {
    setShowScanner(false);

    if (result.kind === 'household') {
      const household = households.find((h) => h.uid === result.uid);
      if (household) {
        handleHouseholdPress(household);
      } else {
        Alert.alert('Not Found', 'Household not found in your route.');
      }
    } else if (result.kind === 'invalid') {
      Alert.alert('Invalid QR', 'Could not read QR code.');
    }
  }, [households, handleHouseholdPress]);

  // Handle FAB press
  const handleFABPress = useCallback(() => {
    setShowScanner(true);
  }, []);

  // Handle collection success with OPTIMISTIC update (instant zero reload!)
  const handleCollectionSuccess = useCallback(() => {
    if (selectedHousehold) {
      recordCollectionOptimistic(selectedHousehold);
      const name = selectedHousehold.headName || (selectedHousehold.houseNumber ? `House ${selectedHousehold.houseNumber}` : 'Household');
      setToastMessage(`Collection Recorded: ${name}`);
      playSuccessSound();

      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setToastMessage(null);
      }, 2500);
    }
    // Silent background refresh (does NOT set isLoading to true)
    refresh(true);
  }, [selectedHousehold, recordCollectionOptimistic, refresh]);

  // Search across ALL households (not limited by pagination)
  const allFilteredHouseholds = useMemo(() => {
    if (!searchQuery.trim()) return households;
    const q = searchQuery.toLowerCase().trim();
    return households.filter((h) => {
      return (
        h.headName?.toLowerCase().includes(q) ||
        h.houseNumber?.toLowerCase().includes(q) ||
        h.uid?.toLowerCase().includes(q)
      );
    });
  }, [households, searchQuery]);

  // Paginated window for smooth FlatList rendering
  const paginatedHouseholds = useMemo(() => {
    return allFilteredHouseholds.slice(0, displayLimit);
  }, [allFilteredHouseholds, displayLimit]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setDisplayLimit(PAGE_SIZE);
  };

  const handleLoadMore = () => {
    if (displayLimit < allFilteredHouseholds.length) {
      setDisplayLimit((prev) => prev + PAGE_SIZE);
    }
  };

  // ── Tab Content ───────────────────────────────────────────────

  const renderTabContent = () => {
    switch (activeTab) {
      case 'announcements':
        return <AnnouncementsScreen />;
      case 'shift':
        return <ShiftScreen />;
      case 'wastelog':
        return <WasteLogScreen />;
      case 'sync':
        return <SyncQueueScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'home':
      default:
        return renderHomeTab();
    }
  };

  const renderHomeTab = () => {
    if (isLoading) return <LoadingState message="Loading your route..." />;

    const hasMore = displayLimit < allFilteredHouseholds.length;

    return (
      <View style={styles.homeContainer}>
        {/* Fixed Header: Stats Cards + Search Bar + Total / Showing Info */}
        <View style={styles.homeHeader}>
          {/* Stats Cards */}
          <StatsCards stats={stats} />

          {/* Premium Search Container */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={Colors.slate500} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholder="Enter Household ID or Name or H.no..."
              placeholderTextColor={Colors.slate400}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearchChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={20} color={Colors.slate500} />
              </TouchableOpacity>
            )}
          </View>

          {/* Section Header with Total / Showing Counts */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {searchQuery ? `SEARCH RESULTS (${allFilteredHouseholds.length})` : `HOUSEHOLDS (${allFilteredHouseholds.length})`}
            </Text>
            <Text style={styles.sectionSubtitle}>
              Showing {Math.min(displayLimit, allFilteredHouseholds.length)} of {allFilteredHouseholds.length}
            </Text>
          </View>
        </View>

        {/* Scrollable Household Cards List */}
        <FlatList
          style={{ flex: 1 }}
          data={paginatedHouseholds}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <HouseholdCard
              household={item}
              isCollectedToday={isAlreadyCollectedToday(item)}
              collectionTime={getCollectionTime(item)}
              onPress={handleHouseholdPress}
            />
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            hasMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={Colors.emerald600} />
                <Text style={styles.loadMoreText}>Loading more households...</Text>
              </View>
            ) : allFilteredHouseholds.length > PAGE_SIZE ? (
              <View style={styles.endOfListContainer}>
                <Text style={styles.endOfListText}>All {allFilteredHouseholds.length} households loaded</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              title={searchQuery ? 'No households found' : 'No households assigned'}
              subtitle={searchQuery ? 'Try a different search query' : 'Contact your manager'}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[Colors.emerald600]}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────

  const pendingCount = syncStats.queued + syncStats.syncing + syncStats.failed;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Brand Header */}
      <CollectorHeader
        isOnline={isConnected}
        onProfilePress={() => setActiveTab('profile')}
      />

      {/* Floating Success Toast Acknowledgment */}
      {toastMessage && (
        <View style={styles.toastContainer} pointerEvents="none">
          <View style={styles.toastBubble}>
            <Ionicons name="checkmark-circle" size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.toastText} numberOfLines={1}>{toastMessage}</Text>
          </View>
        </View>
      )}

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {renderTabContent()}
      </View>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onFABPress={handleFABPress}
        attendanceEnabled={villageData?.attendanceEnabled ?? false}
        wasteLogEnabled={villageData?.collectorWasteLogEnabled ?? false}
        pendingSyncCount={pendingCount}
      />

      {/* QR Scanner */}
      {showScanner && (
        <QRScannerModal
          visible={showScanner}
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
          scanMode="household"
        />
      )}

      {/* Collection Form */}
      {selectedHousehold && (
        <CollectionModal
          key={selectedHousehold.uid || String(selectedHousehold.id)}
          visible={showCollectionModal}
          household={selectedHousehold}
          villageData={villageData}
          onClose={() => { setShowCollectionModal(false); setSelectedHousehold(null); }}
          onSuccess={handleCollectionSuccess}
        />
      )}

      {/* Collection Details Modal for already collected households */}
      <CollectionDetailsModal
        visible={showDetailsModal}
        household={detailHousehold}
        collection={selectedCollectionDetail}
        onClose={() => {
          setShowDetailsModal(false);
          setDetailHousehold(null);
          setSelectedCollectionDetail(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabContent: {
    flex: 1,
  },
  homeContainer: {
    flex: 1,
  },
  homeHeader: {
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.background,
    zIndex: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md + 2,
    height: 46,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fontFamily,
    color: Colors.slate900,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    letterSpacing: 0.6,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
  },
  listContent: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxl + 20,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  loadMoreText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
  },
  endOfListContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  endOfListText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
  },
  toastContainer: {
    position: 'absolute',
    top: 66,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#047857',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    ...Shadows.md,
    maxWidth: '100%',
  },
  toastText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: '#ffffff',
  },
});
