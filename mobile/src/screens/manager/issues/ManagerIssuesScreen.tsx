/**
 * GreenPath Village Manager — Tab 4: Citizen Issues & Resolution Hub
 *
 * issue ticket triage & resolution workflow:
 * - Status Filter Pills: All, Open (🔴), In Progress (🟡), Resolved (🟢) with live counts
 * - Individual ticket cards with left accent strip, category & status badges, relative time,
 *   citizen evidence photo thumbnail, and manager resolution section
 * - Slide-up Issue Management Modal for updating status, manager reply, and photo proof
 * - Full-screen photo inspector for citizen evidence and resolution proof
 * - Real-time client-side filter & full pull-to-refresh support
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
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { fetchManagerIssues } from '../../../api/manager.api';
import { IssueCard } from './IssueCard';
import { IssueManageView } from './IssueManageView';
import { IssueMediaModal } from './IssueMediaModal';
import type { ManagerIssue, IssueStatus } from '../../../types/manager';

interface ManagerIssuesScreenProps {
  isActive?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => Promise<void>;
  onIssuesCountChange?: (activeCount: number) => void;
}

type FilterStatus = 'all' | IssueStatus;

export function ManagerIssuesScreen({
  isActive = true,
  isRefreshing: parentRefreshing,
  onRefresh: parentOnRefresh,
  onIssuesCountChange,
}: ManagerIssuesScreenProps) {
  const [issues, setIssues] = useState<ManagerIssue[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Notify parent dashboard of active (open + in_progress only) issues count
  useEffect(() => {
    const activeCount = issues.filter(
      (i) => i.status === 'open' || i.status === 'in_progress'
    ).length;
    onIssuesCountChange?.(activeCount);
  }, [issues, onIssuesCountChange]);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

  // Management modal state
  const [selectedIssue, setSelectedIssue] = useState<ManagerIssue | null>(null);

  // Media inspection modal state
  const [mediaModal, setMediaModal] = useState<{
    visible: boolean;
    photoUrl: string | null;
    title?: string;
    subtitle?: string;
  }>({
    visible: false,
    photoUrl: null,
  });

  // Fetch issues from API
  const loadIssues = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await fetchManagerIssues();
      setIssues(data);
    } catch (err: any) {
      console.warn('[ManagerIssuesScreen] Failed to fetch issues:', err);
      setError(err?.message || 'Failed to load village issues.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (isActive) {
      loadIssues();
    }
  }, [isActive, loadIssues]);

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (parentOnRefresh) {
      await parentOnRefresh();
    }
    await loadIssues(true);
  }, [parentOnRefresh, loadIssues]);

  // Handle successful issue update
  const handleIssueUpdated = useCallback((updatedIssue: ManagerIssue) => {
    setIssues((prev) =>
      prev.map((item) => (item.id === updatedIssue.id ? updatedIssue : item))
    );
  }, []);

  // Photo viewer trigger
  const handleViewPhoto = useCallback(
    (photoUrl: string, title: string, subtitle: string) => {
      setMediaModal({
        visible: true,
        photoUrl,
        title,
        subtitle,
      });
    },
    []
  );

  // Manage button trigger
  const handleManageIssue = useCallback((issue: ManagerIssue) => {
    setSelectedIssue(issue);
  }, []);

  // Compute live counts
  const openCount = useMemo(
    () => issues.filter((i) => i.status === 'open').length,
    [issues]
  );
  const progressCount = useMemo(
    () => issues.filter((i) => i.status === 'in_progress').length,
    [issues]
  );
  const resolvedCount = useMemo(
    () => issues.filter((i) => i.status === 'resolved').length,
    [issues]
  );

  // Filtered issues list
  const filteredIssues = useMemo(() => {
    if (activeFilter === 'all') return issues;
    return issues.filter((i) => i.status === activeFilter);
  }, [issues, activeFilter]);

  // Filter options config
  const filterTabs = [
    { key: 'all' as const, label: 'All', count: issues.length, dotColor: Colors.slate400 },
    { key: 'open' as const, label: 'Open', count: openCount, dotColor: '#ef4444' },
    { key: 'in_progress' as const, label: 'In Progress', count: progressCount, dotColor: '#f59e0b' },
    { key: 'resolved' as const, label: 'Resolved', count: resolvedCount, dotColor: '#10b981' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {selectedIssue ? (
        <IssueManageView
          issue={selectedIssue}
          onSuccess={(updated) => {
            handleIssueUpdated(updated);
            setSelectedIssue(null);
          }}
          onBack={() => setSelectedIssue(null)}
          onViewPhoto={handleViewPhoto}
        />
      ) : (
        <>
          {/* Top Status Filter Pills Bar */}
          <View style={styles.filterBarContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterBarContent}
            >
              {filterTabs.map((tab) => {
                const isActiveTab = activeFilter === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.filterPill, isActiveTab && styles.filterPillActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveFilter(tab.key);
                    }}
                    activeOpacity={0.75}
                  >
                    {/* Colored status dot */}
                    <View
                      style={[
                        styles.filterDot,
                        { backgroundColor: isActiveTab ? Colors.white : tab.dotColor },
                      ]}
                    />
                    <Text
                      style={[
                        styles.filterPillLabel,
                        isActiveTab && styles.filterPillLabelActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                    {/* Count Badge */}
                    <View
                      style={[
                        styles.countBadge,
                        isActiveTab ? styles.countBadgeActive : styles.countBadgeInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.countBadgeText,
                          isActiveTab ? styles.countBadgeTextActive : styles.countBadgeTextInactive,
                        ]}
                      >
                        {tab.count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Main Content Area */}
          {isLoading && issues.length === 0 ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={Colors.emerald700} />
              <Text style={styles.centerLoadingText}>Loading Issues...</Text>
            </View>
          ) : error && issues.length === 0 ? (
            <View style={styles.centerBox}>
              <View style={styles.errorIconWrap}>
                <Ionicons name="cloud-offline-outline" size={36} color={Colors.destructive} />
              </View>
              <Text style={styles.errorTitle}>Connection Error</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => loadIssues()}
                activeOpacity={0.8}
              >
                <Ionicons name="reload" size={15} color={Colors.white} />
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing || Boolean(parentRefreshing)}
                  onRefresh={handleRefresh}
                  colors={[Colors.emerald700]}
                  tintColor={Colors.emerald700}
                />
              }
            >
              {filteredIssues.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons
                      name={
                        activeFilter === 'all'
                          ? 'checkmark-done-circle-outline'
                          : 'filter-outline'
                      }
                      size={42}
                      color={activeFilter === 'all' ? Colors.emerald700 : Colors.slate400}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {activeFilter === 'all'
                      ? 'No Issues Reported'
                      : `No ${
                          activeFilter === 'open'
                            ? 'Open'
                            : activeFilter === 'in_progress'
                            ? 'In Progress'
                            : 'Resolved'
                        } Issues`}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {activeFilter === 'all'
                      ? 'All village complaints have been handled or none have been submitted yet.'
                      : 'Try selecting a different filter above to view other complaints.'}
                  </Text>
                </View>
              ) : (
                <View style={styles.issuesList}>
                  {filteredIssues.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      onManage={handleManageIssue}
                      onViewPhoto={handleViewPhoto}
                    />
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* Full-Screen Evidence / Proof Media Modal */}
      <IssueMediaModal
        visible={mediaModal.visible}
        photoUrl={mediaModal.photoUrl}
        title={mediaModal.title}
        subtitle={mediaModal.subtitle}
        onClose={() => setMediaModal({ visible: false, photoUrl: null })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterBarContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
    paddingVertical: Spacing.sm + 2,
    ...Shadows.sm,
  },
  filterBarContent: {
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.xs + 2,
    alignItems: 'center',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: Colors.slate900,
    borderColor: Colors.slate900,
    ...Shadows.sm,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterPillLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    fontWeight: '700',
    color: Colors.slate700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterPillLabelActive: {
    color: Colors.white,
  },
  countBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeInactive: {
    backgroundColor: Colors.slate100,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  countBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    fontWeight: '700',
  },
  countBadgeTextInactive: {
    color: Colors.slate500,
  },
  countBadgeTextActive: {
    color: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl * 2,
  },
  issuesList: {
    gap: Spacing.md,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  centerLoadingText: {
    marginTop: Spacing.sm,
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.destructiveLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    fontWeight: '700',
    color: Colors.slate900,
    marginBottom: Spacing.xs,
  },
  errorMessage: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.emerald700,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  retryBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 1.5,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    fontWeight: '700',
    color: Colors.slate800,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});
