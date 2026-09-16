/**
 * GreenPath Village Manager — Tab 2: Household Collection Detail View
 *
 * Full-screen drill-down view matching web dashboard (CollectionDetailView):
 * - Sticky header with back button, resident head name, UID and Ward
 * - Aggregate KPI cards (Total Collections, Avg Segregation ⭐)
 * - Historical collection cards sorted chronologically desc
 * - Star rating, collector attribution, collection status (collected / missed)
 * - Media buttons opening CollectionMediaModal (photo & voice note remarks)
 * - Pagination ("View All" / load more)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { fetchHouseholdCollectionHistory } from '../../../api/manager.api';
import { CollectionMediaModal } from './CollectionMediaModal';
import { ExpandableText } from '../../../components/common/ExpandableText';
import type {
  ManagerCollectionHousehold,
  ManagerHouseholdCollectionItem,
} from '../../../types/manager';

interface CollectionDetailViewProps {
  household: ManagerCollectionHousehold;
  onBack: () => void;
}

export function CollectionDetailView({
  household,
  onBack,
}: CollectionDetailViewProps) {
  const [offset, setOffset] = useState(0);
  const limit = 10;
  const [allCollections, setAllCollections] = useState<ManagerHouseholdCollectionItem[]>([]);
  const [stats, setStats] = useState<{ avgRating: number; totalCollections: number }>({
    avgRating: 0,
    totalCollections: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [mediaPopup, setMediaPopup] = useState<{
    type: 'photo' | 'voice';
    url: string | null;
    remarks?: string | null;
  } | null>(null);

  const loadData = useCallback(async (currentOffset: number, append: boolean) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const res = await fetchHouseholdCollectionHistory(household.uid, limit, currentOffset);
      if (res?.data) {
        setAllCollections((prev) => (append ? [...prev, ...res.data] : res.data));
      }
      if (res?.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.warn('[CollectionDetailView] Failed to load history:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [household.uid]);

  useEffect(() => {
    loadData(0, false);
  }, [loadData]);

  const handleLoadMore = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextOffset = offset + limit;
    setOffset(nextOffset);
    loadData(nextOffset, true);
  };

  const hasMore = allCollections.length < (stats.totalCollections || 0);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  }, [onBack]);

  useEffect(() => {
    const handleHardwareBack = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => sub.remove();
  }, [handleBack]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Sticky Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.slate800} />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headName} numberOfLines={1}>
              {household.headName}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{household.uid}</Text>
              <View style={styles.metaDot} />
              <Text style={styles.metaText}>{household.ward}</Text>
            </View>
          </View>
        </View>

        {/* Main Timeline Scroll */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Real Aggregates Header (Grid of 2 KPI Cards) */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Collections</Text>
              <Text style={styles.kpiValue}>
                {stats.totalCollections || 0}
              </Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Avg Segregation</Text>
              <View style={styles.avgRatingRow}>
                <Text style={styles.kpiValue}>
                  {stats.avgRating ? stats.avgRating.toFixed(1) : '0.0'}
                </Text>
                <Ionicons name="star" size={20} color="#eab308" />
              </View>
            </View>
          </View>

          {/* Collection History Timeline */}
          <View style={styles.timelineSection}>
            <Text style={styles.sectionHeader}>Collection History</Text>

            {isLoading && allCollections.length === 0 ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={Colors.emerald700} />
                <Text style={styles.loadingText}>Loading history...</Text>
              </View>
            ) : allCollections.length > 0 ? (
              <View style={styles.cardsList}>
                {allCollections.map((collection) => {
                  const dateObj = new Date(collection.collectionDate);
                  const dateStr = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Recent';
                  const timeStr = !isNaN(dateObj.getTime())
                    ? dateObj.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : '';

                  const isMissed = collection.status === 'missed';

                  return (
                    <View key={collection.id} style={styles.historyCard}>
                      {/* Top Row: Date & Rating / Collector */}
                      <View style={styles.cardTopRow}>
                        <View style={styles.dateCol}>
                          <Text style={styles.cardDateText}>{dateStr}</Text>
                          {timeStr ? (
                            <Text style={styles.cardTimeText}>{timeStr}</Text>
                          ) : null}
                        </View>

                        <View style={styles.ratingCol}>
                          <View style={styles.starRow}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Ionicons
                                key={s}
                                name={s <= (collection.segregationRating || 0) ? 'star' : 'star-outline'}
                                size={13}
                                color={s <= (collection.segregationRating || 0) ? '#eab308' : Colors.slate200}
                              />
                            ))}
                          </View>
                          <Text style={styles.collectorText} numberOfLines={1}>
                            {collection.collectorName || 'Field Staff'}
                          </Text>
                        </View>
                      </View>

                      {/* Inline Remark with '...Read more' */}
                      {collection.remarks ? (
                        <View style={styles.cardRemarksBox}>
                          <View style={styles.cardRemarksHeader}>
                            <Ionicons name="chatbubble-ellipses-outline" size={11} color={Colors.emerald700} />
                            <Text style={styles.cardRemarksLabel}>Remark</Text>
                          </View>
                          <ExpandableText
                            text={collection.remarks}
                            numberOfLines={2}
                            charLimit={75}
                            style={styles.cardRemarksText}
                            readMoreColor={Colors.emerald700}
                          />
                        </View>
                      ) : null}

                      {/* Inline Missed Reason with '...Read more' */}
                      {isMissed && collection.missedReason ? (
                        <View style={styles.cardMissedBox}>
                          <View style={styles.cardRemarksHeader}>
                            <Ionicons name="alert-circle-outline" size={11} color={Colors.destructive} />
                            <Text style={styles.cardMissedLabel}>Missed Reason</Text>
                          </View>
                          <ExpandableText
                            text={collection.missedReason}
                            numberOfLines={2}
                            charLimit={75}
                            style={styles.cardMissedText}
                            readMoreColor={Colors.destructive}
                          />
                        </View>
                      ) : null}

                      {/* Bottom Row: Status & Media Buttons */}
                      <View style={styles.cardBottomRow}>
                        <View style={styles.statusIndicator}>
                          <View
                            style={[
                              styles.statusDot,
                              isMissed ? styles.dotMissed : styles.dotCollected,
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusLabel,
                              isMissed ? styles.statusMissedText : styles.statusCollectedText,
                            ]}
                          >
                            {isMissed ? 'MISSED' : 'COLLECTED'}
                          </Text>
                        </View>

                        <View style={styles.mediaButtonsGroup}>
                          {collection.photoUrl ? (
                            <TouchableOpacity
                              style={styles.photoThumbBtn}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setMediaPopup({
                                  type: 'photo',
                                  url: collection.photoUrl,
                                  remarks: collection.remarks,
                                });
                              }}
                              activeOpacity={0.8}
                            >
                              <Image
                                source={{ uri: collection.photoUrl }}
                                style={styles.photoThumbImg}
                                resizeMode="cover"
                              />
                              <View style={styles.photoThumbCameraBadge}>
                                <Ionicons name="camera" size={8} color={Colors.white} />
                              </View>
                            </TouchableOpacity>
                          ) : null}

                          {collection.voiceUrl || collection.remarks ? (
                            <TouchableOpacity
                              style={[styles.mediaPillBtn, styles.voicePill]}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setMediaPopup({
                                  type: 'voice',
                                  url: collection.voiceUrl || null,
                                  remarks: collection.remarks,
                                });
                              }}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="volume-medium" size={12} color={Colors.purple600} />
                              <Text style={styles.voicePillText}>Remarks</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* View All / Load More Button */}
                {hasMore ? (
                  <TouchableOpacity
                    style={styles.loadMoreBtn}
                    onPress={handleLoadMore}
                    disabled={isLoadingMore}
                    activeOpacity={0.8}
                  >
                    {isLoadingMore ? (
                      <ActivityIndicator size="small" color={Colors.slate900} />
                    ) : (
                      <>
                        <Text style={styles.loadMoreText}>View More Collections</Text>
                        <Ionicons name="chevron-down" size={16} color={Colors.slate900} />
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <View style={styles.emptyHistoryBox}>
                <View style={styles.emptyHistoryIcon}>
                  <Ionicons name="clipboard-outline" size={36} color={Colors.slate400} />
                </View>
                <Text style={styles.emptyHistoryTitle}>No Collections Recorded</Text>
                <Text style={styles.emptyHistorySubtitle}>
                  No collection entries found for this household yet.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Media Preview Modal */}
        {mediaPopup ? (
          <CollectionMediaModal
            type={mediaPopup.type}
            url={mediaPopup.url}
            remarks={mediaPopup.remarks}
            onClose={() => setMediaPopup(null)}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.slate50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    gap: Spacing.md,
    ...Shadows.sm,
    zIndex: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headName: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.slate300,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xl,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
    gap: Spacing.xs,
  },
  kpiLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  kpiValue: {
    fontSize: 24,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  avgRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timelineSection: {
    gap: Spacing.md,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 2,
  },
  cardsList: {
    gap: Spacing.md,
  },
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.slate100,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateCol: {
    gap: 2,
  },
  cardDateText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    textTransform: 'uppercase',
  },
  cardTimeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ratingCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  collectorText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate700,
    textTransform: 'uppercase',
    maxWidth: 120,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.slate50,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotCollected: {
    backgroundColor: Colors.emerald600,
  },
  dotMissed: {
    backgroundColor: Colors.destructive,
  },
  statusLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    letterSpacing: 1,
  },
  statusCollectedText: {
    color: Colors.emerald600,
  },
  statusMissedText: {
    color: Colors.destructive,
  },
  mediaButtonsGroup: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  mediaPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  photoThumbBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  photoThumbImg: {
    width: '100%',
    height: '100%',
  },
  photoThumbCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 2.5,
    paddingVertical: 1.5,
    borderTopLeftRadius: 4,
  },
  photoPill: {
    backgroundColor: Colors.blue50,
  },
  photoPillText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.blue600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  voicePill: {
    backgroundColor: Colors.purple50,
  },
  voicePillText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.purple600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.slate900,
    borderRadius: BorderRadius.xl,
    paddingVertical: 12,
    gap: 6,
    marginTop: Spacing.sm,
  },
  loadMoreText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyHistoryBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    paddingVertical: 40,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.slate100,
    gap: Spacing.xs,
  },
  emptyHistoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.slate50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyHistoryTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate800,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  emptyHistorySubtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
    textAlign: 'center',
    maxWidth: 240,
  },
  cardRemarksBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: 3,
    borderLeftWidth: 3,
    borderLeftColor: Colors.emerald700,
  },
  cardMissedBox: {
    backgroundColor: '#fef2f2',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: 3,
    borderLeftWidth: 3,
    borderLeftColor: Colors.destructive,
  },
  cardRemarksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardRemarksLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardMissedLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.destructive,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardRemarksText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate700,
    lineHeight: 16,
  },
  cardMissedText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: '#991b1b',
    lineHeight: 16,
  },
});
