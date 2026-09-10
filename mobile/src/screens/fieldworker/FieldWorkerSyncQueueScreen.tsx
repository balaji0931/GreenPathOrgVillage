/**
 * Field Worker Sync Queue Screen
 *
 * Dedicated screen allowing field workers to:
 * - View total & pending offline household mapping syncs
 * - View detailed list of queued/syncing/confirmed/failed mappings
 * - Manually trigger background sync with live animated feedback
 * - Retry failed mapping submissions
 * - Clear confirmed records
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { EmptyState } from '../../components/common/EmptyState';
import { useNetwork } from '../../hooks/useNetwork';
import {
  triggerFieldWorkerSync,
  triggerFieldWorkerManualSync,
  onFieldWorkerSyncStatsChange,
} from '../../services/fieldworker-sync';
import {
  getAllMappingRecords,
  retryFailedMappingRecords,
  clearConfirmedMappingRecords,
} from '../../services/fieldworker-queue';
import type { FieldWorkerQueueStats, QueuedMapping } from '../../types/fieldworker';

type FilterTab = 'all' | 'pending' | 'failed' | 'confirmed';

export function FieldWorkerSyncQueueScreen() {
  const [records, setRecords] = useState<QueuedMapping[]>([]);
  const [stats, setStats] = useState<FieldWorkerQueueStats>({
    total: 0,
    queued: 0,
    syncing: 0,
    confirmed: 0,
    failed: 0,
  });
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isRetryingFailed, setIsRetryingFailed] = useState(false);
  const { isConnected } = useNetwork();

  const isSyncingActive = isManualSyncing || stats.syncing > 0;
  const syncSpinAnim = useRef(new Animated.Value(0)).current;
  const retrySpinAnim = useRef(new Animated.Value(0)).current;

  // Continuously rotate sync icon while sync is in progress
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isSyncingActive) {
      syncSpinAnim.setValue(0);
      animation = Animated.loop(
        Animated.timing(syncSpinAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animation.start();
    } else {
      syncSpinAnim.stopAnimation();
      syncSpinAnim.setValue(0);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [isSyncingActive]);

  // Continuously rotate retry icon while retrying failed records
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isRetryingFailed) {
      retrySpinAnim.setValue(0);
      animation = Animated.loop(
        Animated.timing(retrySpinAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animation.start();
    } else {
      retrySpinAnim.stopAnimation();
      retrySpinAnim.setValue(0);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [isRetryingFailed]);

  const syncSpin = syncSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const retrySpin = retrySpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const loadQueueData = useCallback(() => {
    try {
      const data = getAllMappingRecords();
      setRecords(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadQueueData();
    const unsubscribe = onFieldWorkerSyncStatsChange((newStats) => {
      setStats(newStats);
      loadQueueData();
      if (newStats.syncing === 0) {
        setIsManualSyncing(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadQueueData]);

  const handleSyncNow = async () => {
    if (isSyncingActive || !isConnected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsManualSyncing(true);
    try {
      triggerFieldWorkerManualSync();
      loadQueueData();
    } finally {
      setTimeout(() => {
        setIsManualSyncing(false);
        loadQueueData();
      }, 600);
    }
  };

  const handleRetryFailed = async () => {
    if (isRetryingFailed || isSyncingActive) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRetryingFailed(true);
    try {
      retryFailedMappingRecords();
      loadQueueData();
      triggerFieldWorkerSync();
      loadQueueData();
    } finally {
      setTimeout(() => {
        setIsRetryingFailed(false);
        loadQueueData();
      }, 600);
    }
  };

  const handleClearConfirmed = () => {
    Alert.alert(
      'Clear Confirmed',
      'Remove successfully synced records from the local history list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearConfirmedMappingRecords();
            loadQueueData();
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    loadQueueData();
    if (isConnected) {
      triggerFieldWorkerSync();
    }
    setIsRefreshing(false);
  };

  const pendingCount = stats.queued + stats.syncing + stats.failed;

  // Filtered records based on active tab
  const filteredRecords = useMemo(() => {
    if (activeFilter === 'pending') {
      return records.filter((r) => r.syncStatus === 'QUEUED' || r.syncStatus === 'SYNCING');
    }
    if (activeFilter === 'failed') {
      return records.filter((r) => r.syncStatus === 'FAILED');
    }
    if (activeFilter === 'confirmed') {
      return records.filter((r) => r.syncStatus === 'CONFIRMED');
    }
    return records;
  }, [records, activeFilter]);

  const renderItem = ({ item }: { item: QueuedMapping }) => {
    const isConfirmed = item.syncStatus === 'CONFIRMED';
    const isFailed = item.syncStatus === 'FAILED';
    const isSyncing = item.syncStatus === 'SYNCING';

    return (
      <View style={styles.recordCard}>
        {/* Card Header: Head Name & Sync Status */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleBox}>
            <Text style={styles.cardHeadName} numberOfLines={1}>
              {item.headName}
            </Text>
            <Text style={styles.cardHouseNumber}>House #{item.houseNumber}</Text>
          </View>

          {/* Sync Status Badge */}
          <View
            style={[
              styles.statusBadge,
              isConfirmed && styles.statusBadgeConfirmed,
              isFailed && styles.statusBadgeFailed,
              isSyncing && styles.statusBadgeSyncing,
              !isConfirmed && !isFailed && !isSyncing && styles.statusBadgeQueued,
            ]}
          >
            <Ionicons
              name={
                isConfirmed
                  ? 'checkmark-circle'
                  : isFailed
                  ? 'alert-circle'
                  : isSyncing
                  ? 'sync'
                  : 'time-outline'
              }
              size={13}
              color={
                isConfirmed
                  ? Colors.emerald700
                  : isFailed
                  ? Colors.destructive
                  : isSyncing
                  ? Colors.blue600
                  : Colors.amber600
              }
            />
            <Text
              style={[
                styles.statusBadgeText,
                isConfirmed && { color: Colors.emerald700 },
                isFailed && { color: Colors.destructive },
                isSyncing && { color: Colors.blue600 },
                !isConfirmed && !isFailed && !isSyncing && { color: Colors.amber600 },
              ]}
            >
              {item.syncStatus}
            </Text>
          </View>
        </View>

        {/* QR Code UID pill */}
        <View style={styles.qrRow}>
          <View style={styles.qrBadge}>
            <Ionicons name="qr-code" size={12} color={Colors.emerald700} />
            <Text style={styles.qrText} numberOfLines={1}>
              {item.uid}
            </Text>
          </View>
          <Text style={styles.wardBadge}>{item.ward}</Text>
        </View>

        {/* Meta details: Phone, type, family size */}
        <View style={styles.metaRow}>
          {Boolean(item.phone) && (
            <View style={styles.metaItem}>
              <Ionicons name="call-outline" size={12} color={Colors.slate500} />
              <Text style={styles.metaText}>{item.phone}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={12} color={Colors.slate500} />
            <Text style={styles.metaText}>{item.familySize} Members</Text>
          </View>
          {Boolean(item.latitude) && Boolean(item.longitude) && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color={Colors.slate500} />
              <Text style={styles.metaText}>GPS Saved</Text>
            </View>
          )}
        </View>

        {/* Failed error message banner */}
        {isFailed && Boolean(item.syncError) && (
          <View style={styles.errorBox}>
            <Ionicons name="warning-outline" size={14} color={Colors.destructive} />
            <Text style={styles.errorText} numberOfLines={2}>
              {item.syncError}
            </Text>
          </View>
        )}

        {/* Footer timestamp */}
        <View style={styles.cardFooter}>
          <Text style={styles.timeText}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
            {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </Text>
          {Boolean(item.syncAttempts > 0) && (
            <Text style={styles.attemptsText}>Attempts: {item.syncAttempts}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Fixed Area */}
      <View style={styles.fixedTopSection}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Offline Queue</Text>
          <Text style={styles.subtitle}>
            {isConnected ? 'Connected — Auto-syncing mappings' : 'Offline — Saved locally to SQLite'}
          </Text>
        </View>

        {/* Hero Card */}
        <View style={[styles.heroCard, pendingCount > 0 ? styles.heroCardPending : styles.heroCardSynced]}>
          <View style={styles.heroTop}>
            <View
              style={[
                styles.heroIconBox,
                pendingCount > 0
                  ? { backgroundColor: Colors.blue50 }
                  : { backgroundColor: Colors.emerald50 },
              ]}
            >
              <Ionicons
                name={pendingCount > 0 ? 'cloud-upload' : 'cloud-done'}
                size={26}
                color={pendingCount > 0 ? Colors.blue600 : Colors.emerald700}
              />
            </View>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroTitle}>
                {pendingCount > 0 ? `${pendingCount} Mappings Pending` : 'All Synced Up'}
              </Text>
              <Text style={styles.heroSubtitle}>
                {pendingCount > 0
                  ? 'Mappings stored safely on device and will sync automatically'
                  : 'All offline household mappings confirmed on server'}
              </Text>
            </View>
          </View>

          {/* Breakdown Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>QUEUED</Text>
              <Text style={styles.statPillValue}>{stats.queued}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>SYNCING</Text>
              <Text style={[styles.statPillValue, { color: Colors.blue600 }]}>{stats.syncing}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>FAILED</Text>
              <Text style={[styles.statPillValue, stats.failed > 0 && { color: Colors.destructive }]}>
                {stats.failed}
              </Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>SYNCED</Text>
              <Text style={[styles.statPillValue, { color: Colors.emerald700 }]}>{stats.confirmed}</Text>
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.heroActionRow}>
            <TouchableOpacity
              style={[
                styles.syncButton,
                (!isConnected || isSyncingActive || isRetryingFailed) && styles.syncButtonDisabled,
              ]}
              onPress={handleSyncNow}
              disabled={!isConnected || isSyncingActive || isRetryingFailed}
              activeOpacity={0.8}
            >
              <Animated.View style={{ transform: [{ rotate: isSyncingActive ? syncSpin : '0deg' }] }}>
                <Ionicons name="sync" size={17} color={Colors.white} />
              </Animated.View>
              <Text style={styles.syncButtonText}>
                {isSyncingActive ? 'Syncing...' : isConnected ? 'Sync Now' : 'Offline'}
              </Text>
            </TouchableOpacity>

            {stats.failed > 0 && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetryFailed}
                disabled={isRetryingFailed || isSyncingActive}
                activeOpacity={0.8}
              >
                <Animated.View style={{ transform: [{ rotate: isRetryingFailed ? retrySpin : '0deg' }] }}>
                  <Ionicons name="refresh" size={16} color={Colors.destructive} />
                </Animated.View>
                <Text style={styles.retryButtonText}>
                  {isRetryingFailed ? 'Retrying...' : 'Retry Failed'}
                </Text>
              </TouchableOpacity>
            )}

            {stats.confirmed > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearConfirmed}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={16} color={Colors.slate500} />
                <Text style={styles.clearButtonText}>Clear Synced</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabsRow}>
          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>
              All ({records.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'pending' && styles.filterTabActive]}
            onPress={() => setActiveFilter('pending')}
          >
            <Text style={[styles.filterTabText, activeFilter === 'pending' && styles.filterTabTextActive]}>
              Pending ({stats.queued + stats.syncing})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'failed' && styles.filterTabActive]}
            onPress={() => setActiveFilter('failed')}
          >
            <Text style={[styles.filterTabText, activeFilter === 'failed' && styles.filterTabTextActive]}>
              Failed ({stats.failed})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'confirmed' && styles.filterTabActive]}
            onPress={() => setActiveFilter('confirmed')}
          >
            <Text style={[styles.filterTabText, activeFilter === 'confirmed' && styles.filterTabTextActive]}>
              Synced ({stats.confirmed})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Queue List */}
      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.clientRequestId}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors.emerald700]}
            tintColor={Colors.emerald700}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No Mappings in Queue"
            subtitle={
              activeFilter === 'all'
                ? 'Household mappings you digitize offline or online will appear here.'
                : `No mappings match the "${activeFilter}" filter.`
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fixedTopSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.background,
  },
  header: {
    marginBottom: Spacing.md,
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
  heroCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  heroCardPending: {
    backgroundColor: Colors.white,
    borderColor: Colors.blue100,
  },
  heroCardSynced: {
    backgroundColor: Colors.white,
    borderColor: Colors.emerald100,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroIconBox: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  heroTextCol: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  heroSubtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  statPill: {
    flex: 1,
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderMedium,
  },
  statPillLabel: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    letterSpacing: 0.5,
  },
  statPillValue: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate800,
    marginTop: 1,
  },
  heroActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  syncButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.emerald700,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
    ...Shadows.sm,
  },
  syncButtonDisabled: {
    backgroundColor: Colors.slate300,
  },
  syncButtonText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.white,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.destructiveLight,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: 4,
  },
  retryButtonText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.destructive,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate100,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: 4,
  },
  clearButtonText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
  },
  filterTabActive: {
    backgroundColor: Colors.emerald700,
  },
  filterTabText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
  },
  filterTabTextActive: {
    color: Colors.white,
    fontFamily: Typography.fontFamilySemiBold,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  recordCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  cardTitleBox: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  cardHeadName: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  cardHouseNumber: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  statusBadgeConfirmed: {
    backgroundColor: Colors.emerald50,
  },
  statusBadgeFailed: {
    backgroundColor: Colors.destructiveLight,
  },
  statusBadgeSyncing: {
    backgroundColor: Colors.blue50,
  },
  statusBadgeQueued: {
    backgroundColor: Colors.warningLight,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    textTransform: 'uppercase',
  },
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: Spacing.xs,
  },
  qrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.emerald50,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.md,
    gap: 4,
    maxWidth: '70%',
  },
  qrText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.emerald700,
  },
  wardBadge: {
    fontSize: 12,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate600,
    backgroundColor: Colors.slate100,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: 4,
    marginBottom: Spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.destructiveLight,
    padding: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    marginTop: 4,
    marginBottom: Spacing.xs,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.destructive,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    paddingTop: Spacing.xs,
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
  },
  attemptsText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
  },
});
