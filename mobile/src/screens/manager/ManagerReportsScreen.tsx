/**
 * GreenPath Village Manager — Tab 1: Daily Reports & KPI Analytics Screen
 *
 * Master Screen Orchestrator:
 * - Pinned sticky date switcher (previous/next day, calendar picker, today snap)
 * - Daily insights & pulse grid (households, not collected, collection & segregation pulses with 7-day sparklines)
 * - Household collection efficiency card with insight banner and feed shortcut
 * - Daily waste material logs card with 5 streams and actionable empty state
 * - Landfill waste diversion rate card (formula-based gauge and comparative metrics)
 * - Ward performance breakdown with horizontal stacked bars
 * - Fleet performance and collector session breakdown with interactive details modal
 * - Hourly collection timeline with peak window highlight
 * - Bottom-right PDF Export FAB
 * - Full pull-to-refresh support
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  AppState,
  type AppStateStatus,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { fetchManagerAnalyticsPremium, fetchManagerDailyAttendance } from '../../api/manager.api';
import { useAuth } from '../../auth/AuthProvider';
import { generateDailyReportPDFMobile, type PDFReportData } from '../../services/daily-report-pdf.service';
import {
  getCachedReport,
  saveCachedReport,
  isTodayDate,
  getTodayDateStr,
  purgeOldReportsCache,
} from '../../services/manager-cache';
import {
  ReportsDateSwitcher,
  ReportsKpiPulseGrid,
  ReportsCoverageCard,
  ReportsMaterialBreakdownCard,
  ReportsDiversionRateCard,
  ReportsWardPerformanceCard,
  ReportsVehiclePerformanceCard,
  SessionDetailsView,
  ReportsHourlyTimelineCard,
  ReportsPdfFab,
} from './reports';
import type {
  ManagerVillageData,
  ManagerTab,
  ManagerMoreScreenId,
  ManagerPremiumReportData,
} from '../../types/manager';

interface ManagerReportsScreenProps {
  villageData: ManagerVillageData | null;
  onNavigateToTab: (tab: ManagerTab) => void;
  onNavigateToSubScreen?: (screenId: ManagerMoreScreenId) => void;
  isActive?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export function ManagerReportsScreen({
  villageData,
  onNavigateToTab,
  onNavigateToSubScreen,
  isActive = true,
  isRefreshing = false,
  onRefresh,
}: ManagerReportsScreenProps) {
  const { user } = useAuth();
  const effectiveVillageId = (villageData?.id || user?.villageId || '').trim();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr);

  // Purge any cache from previous days immediately on mount
  useEffect(() => {
    purgeOldReportsCache();
  }, []);

  // Initialize synchronously from cache (ONLY if today, 0ms render, zero spinner)
  const [reportData, setReportData] = useState<ManagerPremiumReportData | null>(() => {
    return getCachedReport(effectiveVillageId, getTodayDateStr());
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const cached = getCachedReport(effectiveVillageId, getTodayDateStr());
    return !cached;
  });
  const [hasError, setHasError] = useState<boolean>(false);
  const [localRefreshing, setLocalRefreshing] = useState<boolean>(false);
  const [sessionDetailsOpen, setSessionDetailsOpen] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Fetch report data for village and selectedDate
  // Caching and silent background sync are ONLY applied to TODAY
  const loadReportData = useCallback(
    async (showLoadingSpinner = true) => {
      if (!effectiveVillageId) {
        setIsLoading(false);
        return;
      }

      const isToday = isTodayDate(selectedDate);
      const cached = isToday ? getCachedReport(effectiveVillageId, selectedDate) : null;

      if (cached) {
        setReportData(cached);
        setIsLoading(false);
      } else if (showLoadingSpinner) {
        setIsLoading(true);
      }

      setHasError(false);
      try {
        const data = await fetchManagerAnalyticsPremium(effectiveVillageId, selectedDate);
        if (data) {
          // ONLY cache today's date (historical dates are never cached)
          if (isToday) {
            saveCachedReport(effectiveVillageId, selectedDate, data);
          }
          setReportData(data);
          setHasError(false);
        } else if (!cached) {
          setHasError(true);
        }
      } catch (err) {
        console.warn('[ManagerReportsScreen] Failed to load manager report data:', err);
        if (!cached) {
          setHasError(true);
        }
      } finally {
        setIsLoading(false);
        setLocalRefreshing(false);
      }
    },
    [effectiveVillageId, selectedDate]
  );

  useEffect(() => {
    const isToday = isTodayDate(selectedDate);
    const cached = isToday ? getCachedReport(effectiveVillageId, selectedDate) : null;
    // For Today: only show spinner if not yet cached. For other dates: show spinner once.
    loadReportData(!cached);
  }, [loadReportData, effectiveVillageId, selectedDate]);

  // Listen for AppState changes (e.g. app brought to foreground the next day)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const todayStr = getTodayDateStr();
        // Purge any cache for dates other than current today
        purgeOldReportsCache();

        // If currently viewing "today", trigger silent sync; if date rolled over, advance to new today
        setSelectedDate((prevDate) => {
          if (isTodayDate(prevDate)) {
            return prevDate;
          }
          if (prevDate < todayStr) {
            return todayStr;
          }
          return prevDate;
        });

        if (isTodayDate(selectedDate)) {
          loadReportData(false);
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [selectedDate, loadReportData]);

  // When Reports tab becomes active from another tab, purge old dates & silently refresh today
  useEffect(() => {
    if (isActive) {
      purgeOldReportsCache();
      if (isTodayDate(selectedDate)) {
        loadReportData(false);
      }
    }
  }, [isActive, selectedDate, loadReportData]);

  // Pull-to-refresh handler
  const handlePullRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLocalRefreshing(true);
    if (onRefresh) {
      onRefresh();
    }
    await loadReportData(false);
  }, [loadReportData, onRefresh]);

  // Date change handler from DateSwitcher
  const handleChangeDate = (newDateStr: string) => {
    const isToday = isTodayDate(newDateStr);
    const cached = isToday ? getCachedReport(effectiveVillageId, newDateStr) : null;
    if (cached) {
      setReportData(cached);
      setIsLoading(false);
    } else {
      // Historical dates are never cached: clear old data and show spinner
      setReportData(null);
      setIsLoading(true);
    }
    setSelectedDate(newDateStr);
  };

  // Shortcut to Collections feed
  const handleGoToCollections = () => {
    onNavigateToTab('collections');
  };

  // Shortcut to Daily Waste Logs tool
  const handleGoToWasteLogs = () => {
    if (onNavigateToSubScreen) {
      onNavigateToSubScreen('daily-waste-logs');
    } else {
      onNavigateToTab('more');
    }
  };

  // PDF FAB export trigger — client-side background generation without blocking modals
  const handlePressPdfExport = async () => {
    if (isGeneratingPdf) return;

    if (!reportData) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Please Wait', 'Daily report data is still loading.');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Fetch attendance for all worker types in parallel (matching web manager-dashboard.tsx)
      let attendance: PDFReportData['attendance'] | undefined;
      try {
        const [colData, helpData, segData] = await Promise.all([
          fetchManagerDailyAttendance(selectedDate, 'collector'),
          fetchManagerDailyAttendance(selectedDate, 'helper'),
          fetchManagerDailyAttendance(selectedDate, 'segregator'),
        ]);
        attendance = {
          collectors: (colData.workers || []).map((w) => ({ workerName: w.workerName, attendance: w.attendance })),
          helpers: (helpData.workers || []).map((w) => ({ workerName: w.workerName, attendance: w.attendance })),
          segregators: (segData.workers || []).map((w) => ({ workerName: w.workerName, attendance: w.attendance })),
        };
      } catch {
        // Attendance optional fallback
      }

      const pdfData: PDFReportData = {
        villageName: villageData?.name || 'GreenPath Village',
        villageId: villageData?.id || user?.villageId || 'VILLAGE',
        date: selectedDate,
        managerName: user?.name || 'Manager',
        kpis: {
          totalHouseholds: reportData.kpis.totalHouseholds,
          collectedToday: reportData.kpis.collectedToday,
          collectedYesterday: reportData.kpis.collectedYesterday,
          nonCollectedToday: reportData.kpis.nonCollectedToday,
          avgSegregationRating: reportData.kpis.avgSegregationRating,
        },
        pulses: reportData.pulses,
        wardPerformance: reportData.wardPerformance,
        materialData: reportData.materialData,
        vehicleStats: reportData.vehicleStats,
        collectionTimeline: reportData.collectionTimeline,
        attendance,
      };

      const result = await generateDailyReportPDFMobile(pdfData);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Directly open native OS share and save dialog (matching map download)
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Export ${result.fileName}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Export Notice', 'Sharing is not supported on this device.');
      }
    } catch (err) {
      console.warn('[ManagerReportsScreen] Failed to generate or share PDF:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Export Error', 'Failed to generate and share the PDF report.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // If session details view is open, render it inline (header + bottom nav stay visible)
  if (sessionDetailsOpen && reportData?.vehicleStats) {
    return (
      <View style={styles.root}>
        <SessionDetailsView
          vehicleStats={reportData.vehicleStats}
          dateLabel={selectedDate}
          onBack={() => setSessionDetailsOpen(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Sticky Date Switcher pinned at top */}
      <ReportsDateSwitcher
        date={selectedDate}
        onChangeDate={handleChangeDate}
      />

      {/* Main Content Area */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.emerald700} />
          <Text style={styles.loadingText}>Generating Daily Reports...</Text>
          <Text style={styles.loadingSubText}>{selectedDate}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing || localRefreshing}
              onRefresh={handlePullRefresh}
              colors={[Colors.emerald700]}
              tintColor={Colors.emerald700}
            />
          }
        >
          {/* Error Banner if reportData could not be fetched */}
          {hasError && !reportData && (
            <View style={styles.errorCard}>
              <Ionicons name="cloud-offline-outline" size={36} color={Colors.warning} />
              <Text style={styles.errorTitle}>Unable to Load Report</Text>
              <Text style={styles.errorDesc}>
                Could not retrieve report data for {selectedDate}. Check your connection or tap below to retry.
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => loadReportData(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={16} color={Colors.white} />
                <Text style={styles.retryButtonText}>Retry Loading</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Section 1: KPI Pulse Grid (Households, Not Collected, Collection & Segregation Pulses) */}
          {reportData?.kpis && reportData?.pulses && (
            <ReportsKpiPulseGrid
              kpis={reportData.kpis}
              pulses={reportData.pulses}
            />
          )}

          {/* Section 2: Household Collection Efficiency / Coverage Card */}
          {reportData?.kpis && (
            <ReportsCoverageCard
              collectedCount={reportData.kpis.collectedToday}
              totalHouseholds={reportData.kpis.totalHouseholds}
              onNavigateToCollections={handleGoToCollections}
            />
          )}

          {/* Section 3: Daily Waste Material Breakdown (5 Streams & Empty State) */}
          {reportData?.materialData && (
            <ReportsMaterialBreakdownCard
              materialData={reportData.materialData}
              onNavigateToWasteLog={handleGoToWasteLogs}
            />
          )}

          {/* Section 3.5: Waste Diversion Rate Card */}
          {reportData?.materialData && (
            <ReportsDiversionRateCard materialData={reportData.materialData} />
          )}

          {/* Section 4: Ward Performance Breakdown */}
          {reportData?.wardPerformance && (
            <ReportsWardPerformanceCard
              wardPerformance={reportData.wardPerformance}
            />
          )}

          {/* Section 5: Fleet & Collector Session Breakdown */}
          {reportData?.vehicleStats && (
            <ReportsVehiclePerformanceCard
              vehicleStats={reportData.vehicleStats}
              dateLabel={selectedDate}
              onOpenSessionDetails={() => setSessionDetailsOpen(true)}
            />
          )}

          {/* Section 6: Hourly Collection Timeline */}
          {reportData?.collectionTimeline && (
            <ReportsHourlyTimelineCard
              timeline={reportData.collectionTimeline}
            />
          )}

          {/* Bottom spacing so FAB does not overlap content */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}

      {/* Floating Action Button (FAB) for PDF Export */}
      <ReportsPdfFab
        onPress={handlePressPdfExport}
        isLoading={isGeneratingPdf}
        disabled={isGeneratingPdf}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 70,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.xs,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate800,
    marginTop: Spacing.sm,
  },
  loadingSubText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
  },
  errorCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.slate200,
    marginTop: Spacing.lg,
    ...Shadows.sm,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    marginTop: Spacing.sm,
  },
  errorDesc: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
    lineHeight: 18,
    maxWidth: 280,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.emerald700,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
  },
  retryButtonText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
  bottomSpacer: {
    height: 40,
  },
});
