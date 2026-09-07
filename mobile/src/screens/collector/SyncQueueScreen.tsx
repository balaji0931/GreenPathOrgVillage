/**
 * Sync & Offline Queue Screen
 *
 * Dedicated screen allowing collectors to:
 * - View number of pending offline syncs
 * - View list of queued/pending households with full details
 * - Manually trigger background sync with live feedback
 * - Retry failed submissions
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { EmptyState } from '../../components/common/EmptyState';
import { useNetwork } from '../../hooks/useNetwork';
import { triggerSync, onSyncStatsChange, isSyncInProgress } from '../../services/sync-engine';
import {
  getAllQueueRecords,
  retryFailedRecords,
  type QueuedCollection,
  type QueueStats,
} from '../../services/offline-queue';

export function SyncQueueScreen() {
  const [records, setRecords] = useState<QueuedCollection[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    queued: 0,
    syncing: 0,
    confirmed: 0,
    failed: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isRetryingFailed, setIsRetryingFailed] = useState(false);
  const { isConnected } = useNetwork();

  const isSyncingActive = isManualSyncing || stats.syncing > 0 || isSyncInProgress();
  const isRetryingActive = isRetryingFailed;

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
    if (isRetryingActive) {
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
  }, [isRetryingActive]);

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
      const data = getAllQueueRecords();
      setRecords(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadQueueData();
    const unsubscribe = onSyncStatsChange((newStats) => {
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
      await triggerSync();
      loadQueueData();
    } finally {
      setTimeout(() => {
        setIsManualSyncing(false);
        loadQueueData();
      }, 600);
    }
  };

  const handleRetryFailed = async () => {
    if (isRetryingActive || isSyncingActive) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRetryingFailed(true);
    try {
      retryFailedRecords();
      loadQueueData();
      await triggerSync();
      loadQueueData();
    } finally {
      setTimeout(() => {
        setIsRetryingFailed(false);
        loadQueueData();
      }, 600);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    loadQueueData();
    await triggerSync();
    setIsRefreshing(false);
  };

  const pendingCount = stats.queued + stats.syncing + stats.failed;

  return (
    <View style={styles.container}>
      {/* Fixed Top Section: Header + Hero Sync Card + Breakdown + Action Buttons + Section Title */}
      <View style={styles.fixedTopSection}>
        {/* Screen Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Offline Queue</Text>
          <Text style={styles.subtitle}>
            {isConnected ? 'Connected - Auto sync active' : 'Offline - Saved locally to device'}
          </Text>
        </View>

        {/* Hero Sync Status Card */}
        <View style={[styles.heroCard, pendingCount > 0 ? styles.heroCardPending : styles.heroCardSynced]}>
          <View style={styles.heroTop}>
            <View style={styles.heroIconBox}>
              <Ionicons
                name={pendingCount > 0 ? 'cloud-upload' : 'cloud-done'}
                size={28}
                color={pendingCount > 0 ? Colors.blue600 : Colors.emerald600}
              />
            </View>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroTitle}>
                {pendingCount > 0 ? `${pendingCount} Items Pending Sync` : 'All Synced Up'}
              </Text>
              <Text style={styles.heroSubtitle}>
                {pendingCount > 0
                  ? 'Collections stored securely in local database'
                  : 'All offline records confirmed on server'}
              </Text>
            </View>
          </View>

          {/* Breakdown row */}
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>QUEUED</Text>
              <Text style={styles.statPillValue}>{stats.queued}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>SYNCING</Text>
              <Text style={styles.statPillValue}>{stats.syncing}</Text>
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

          {/* Action button */}
          <View style={styles.heroActionRow}>
            <TouchableOpacity
              style={[
                styles.syncButton,
                (!isConnected || isSyncingActive || isRetryingActive) && styles.syncButtonDisabled,
              ]}
              onPress={handleSyncNow}
              disabled={!isConnected || isSyncingActive || isRetryingActive}
              activeOpacity={0.8}
            >
              <Animated.View style={{ transform: [{ rotate: isSyncingActive ? syncSpin : '0deg' }] }}>
                <Ionicons name="sync" size={18} color={Colors.white} />
              </Animated.View>
              <Text style={styles.syncButtonText}>
                {isSyncingActive
                  ? 'Syncing...'
                  : isConnected
                    ? 'Sync Now'
                    : 'Connect to Internet to Sync'}
              </Text>
            </TouchableOpacity>

            {stats.failed > 0 && (
              <TouchableOpacity
                style={[
                  styles.retryButton,
                  (isRetryingActive || isSyncingActive) && styles.retryButtonDisabled,
                ]}
                onPress={handleRetryFailed}
                disabled={isRetryingActive || isSyncingActive}
                activeOpacity={0.7}
              >
                <Animated.View style={{ transform: [{ rotate: isRetryingActive ? retrySpin : '0deg' }] }}>
                  <Ionicons
                    name="refresh"
                    size={16}
                    color={isRetryingActive ? '#b45309' : Colors.destructive}
                  />
                </Animated.View>
                <Text
                  style={[
                    styles.retryButtonText,
                    isRetryingActive && { color: '#b45309' },
                  ]}
                >
                  {isRetryingActive ? 'Retrying...' : 'Retry Failed'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>QUEUED HOUSEHOLDS ({records.length})</Text>
          <Text style={styles.sectionHeaderSubtitle}>Latest first</Text>
        </View>
      </View>

      {/* Only queued households scroll */}
      <FlatList
        style={styles.flatList}
        data={records}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          let wasteTypesParsed: string[] = [];
          try {
            wasteTypesParsed = JSON.parse(item.wasteTypes || '[]');
          } catch {
            wasteTypesParsed = [];
          }

          const isPending = item.syncStatus === 'QUEUED' || item.syncStatus === 'SYNCING';
          const isFailed = item.syncStatus === 'FAILED';

          return (
            <View style={styles.queueCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.cardHeadName} numberOfLines={1}>
                    {item.householdName || 'Household'}
                  </Text>
                  <View style={styles.tagRow}>
                    <View style={styles.tagHouse}>
                      <Text style={styles.tagHouseText}>H.No: {item.houseNumber}</Text>
                    </View>
                    <View style={styles.tagUid}>
                      <Text style={styles.tagUidText}>UID: {item.householdUid}</Text>
                    </View>
                  </View>
                </View>

                {/* Status Badge */}
                <View style={[
                  styles.statusBadge,
                  isPending && styles.statusBadgeQueued,
                  isFailed && styles.statusBadgeFailed,
                  item.syncStatus === 'CONFIRMED' && styles.statusBadgeConfirmed,
                ]}>
                  {item.syncStatus === 'SYNCING' ? (
                    <Animated.View style={{ transform: [{ rotate: syncSpin }] }}>
                      <Ionicons name="sync" size={13} color={Colors.blue600} />
                    </Animated.View>
                  ) : (
                    <Ionicons
                      name={
                        isFailed
                          ? 'alert-circle'
                          : isPending
                            ? 'time'
                            : 'checkmark-circle'
                      }
                      size={14}
                      color={
                        isFailed
                          ? Colors.destructive
                          : isPending
                            ? Colors.amber600
                            : Colors.emerald600
                      }
                    />
                  )}
                  <Text style={[
                    styles.statusBadgeText,
                    isFailed && styles.statusBadgeTextFailed,
                    item.syncStatus === 'CONFIRMED' && styles.statusBadgeTextConfirmed,
                  ]}>
                    {item.syncStatus}
                  </Text>
                </View>
              </View>

              {/* Details Row */}
              <View style={styles.detailsRow}>
                <Text style={styles.collectionTimeText}>
                  {new Date(item.collectionDate).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </Text>

                <View style={styles.detailsBadges}>
                  {item.status === 'missed' ? (
                    <View style={styles.missedPill}>
                      <Text style={styles.missedPillText}>Not Collected ({item.missedReason})</Text>
                    </View>
                  ) : (
                    <>
                      {item.segregationRating > 0 && (
                        <View style={styles.ratingPill}>
                          <Ionicons name="star" size={10} color="#92400e" style={{ marginRight: 2 }} />
                          <Text style={styles.ratingPillText}>{item.segregationRating} / 5</Text>
                        </View>
                      )}
                      {wasteTypesParsed.map((wt) => (
                        <View key={wt} style={styles.typePill}>
                          <Text style={styles.typePillText}>{wt}</Text>
                        </View>
                      ))}
                    </>
                  )}

                  {item.photoLocalPath ? (
                    <View style={styles.mediaPill}>
                      <Ionicons name="camera" size={11} color={Colors.slate500} />
                    </View>
                  ) : null}
                  {item.voiceLocalPath ? (
                    <View style={styles.mediaPill}>
                      <Ionicons name="mic" size={11} color={Colors.slate500} />
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Error Message if failed */}
              {isFailed && item.syncError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText} numberOfLines={2}>
                    Error: {item.syncError}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title="No records in queue"
            subtitle="Collections recorded while offline will appear here until synced."
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fixedTopSection: {
    backgroundColor: Colors.background,
    zIndex: 10,
    paddingTop: Spacing.md,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  flatList: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    marginTop: 2,
  },
  heroCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    borderWidth: 1,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  heroCardPending: {
    borderColor: Colors.blue100,
  },
  heroCardSynced: {
    borderColor: Colors.emerald100,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextCol: {
    flex: 1,
    gap: 2,
  },
  heroTitle: {
    fontSize: 17,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  heroSubtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.xs + 2,
    backgroundColor: Colors.slate50,
    padding: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
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
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  syncButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    backgroundColor: Colors.blue600,
    borderRadius: BorderRadius.xl,
    ...Shadows.blueGlow,
  },
  syncButtonDisabled: {
    backgroundColor: Colors.slate300,
    shadowOpacity: 0,
    elevation: 0,
  },
  syncButtonText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 46,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.destructiveLight,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  retryButtonDisabled: {
    opacity: 0.65,
    borderColor: '#fca5a5',
  },
  retryButtonText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.destructive,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    letterSpacing: 0.6,
  },
  sectionHeaderSubtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxl + 30,
    gap: Spacing.sm + 2,
    flexGrow: 1,
  },
  queueCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.slate200,
    gap: Spacing.xs + 2,
    ...Shadows.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  cardHeadName: {
    fontSize: 15,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate900,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  tagHouse: {
    backgroundColor: Colors.slate100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs + 2,
  },
  tagHouseText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate700,
  },
  tagUid: {
    backgroundColor: Colors.slate50,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs + 2,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  tagUidText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusBadgeQueued: {
    backgroundColor: Colors.warningLight,
  },
  statusBadgeFailed: {
    backgroundColor: Colors.destructiveLight,
  },
  statusBadgeConfirmed: {
    backgroundColor: Colors.emerald50,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.amber600,
  },
  statusBadgeTextFailed: {
    color: Colors.destructive,
  },
  statusBadgeTextConfirmed: {
    color: Colors.emerald700,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  collectionTimeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
  },
  detailsBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  missedPill: {
    backgroundColor: Colors.destructiveLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  missedPillText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.destructive,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  ratingPillText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: '#92400e',
  },
  typePill: {
    backgroundColor: Colors.emerald50,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  typePillText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.emerald700,
    textTransform: 'capitalize',
  },
  mediaPill: {
    backgroundColor: Colors.slate100,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },
  errorBox: {
    backgroundColor: Colors.destructiveLight,
    padding: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
    marginTop: 2,
  },
  errorText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.destructive,
  },
});
