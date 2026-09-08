/**
 * Reports Screen — Collector's Vehicle Report
 *
 * Shows the collector's own vehicle's:
 * 1. Session Report (work/break timeline)
 * 2. Hourly Collection Timeline (bar chart with plain Views)
 *
 * Data fetched from GET /api/collector/vehicle-report
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { Skeleton } from '../../components/common/Skeleton';
import { DatePickerModal } from '../../components/common/DatePickerModal';
import { fetchVehicleReport, type VehicleReport } from '../../api/collector.api';

// ── Helpers ────────────────────────────────────────────────────

function fmtMs(ms: number): string {
  const h = Math.floor(ms / (1000 * 60 * 60));
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function fmtDateLabel(date: Date): string {
  const today = new Date();
  const todayStr = fmtDate(today);
  const dateStr = fmtDate(date);
  if (dateStr === todayStr) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === fmtDate(yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Component ──────────────────────────────────────────────────

export function ReportsScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [report, setReport] = useState<VehicleReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const data = await fetchVehicleReport(fmtDate(selectedDate));
      setReport(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load report');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadReport(true);
  };

  const changeDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    // Don't go into the future
    if (d > new Date()) return;
    setSelectedDate(d);
  };

  const isToday = fmtDate(selectedDate) === fmtDate(new Date());

  const renderDateNav = () => (
    <View style={styles.dateNav}>
      <TouchableOpacity
        onPress={() => changeDate(-1)}
        style={styles.dateButton}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={20} color={Colors.slate600} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.dateSelectorButton}
        onPress={() => setShowCalendar(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={16} color={Colors.emerald700} style={{ marginRight: 6 }} />
        <Text style={styles.dateLabel}>{fmtDateLabel(selectedDate)}</Text>
        <Ionicons name="chevron-down" size={13} color={Colors.slate400} style={{ marginLeft: 6 }} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => changeDate(1)}
        style={[styles.dateButton, isToday && styles.dateButtonDisabled]}
        disabled={isToday}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-forward" size={20} color={isToday ? Colors.slate300 : Colors.slate600} />
      </TouchableOpacity>
    </View>
  );

  // ── Loading Skeleton ──
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          <View style={styles.dateNav}>
            <Skeleton width={36} height={36} borderRadius={18} />
            <Skeleton width={150} height={36} borderRadius={18} />
            <Skeleton width={36} height={36} borderRadius={18} />
          </View>
          <View style={styles.card}>
            <Skeleton height={24} width="50%" borderRadius={4} style={{ marginBottom: 16 }} />
            <Skeleton height={16} width="70%" borderRadius={4} style={{ marginBottom: 12 }} />
            <Skeleton height={60} borderRadius={8} style={{ marginBottom: 8 }} />
            <Skeleton height={60} borderRadius={8} />
          </View>
          <View style={styles.card}>
            <Skeleton height={24} width="50%" borderRadius={4} style={{ marginBottom: 16 }} />
            <Skeleton height={120} borderRadius={8} />
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── No Vehicle Assigned ──
  if (report && !report.vehicleName) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {renderDateNav()}
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={48} color={Colors.slate300} />
            <Text style={styles.emptyTitle}>No Vehicle Assigned</Text>
            <Text style={styles.emptySubtitle}>Contact your manager to get assigned to a vehicle.</Text>
          </View>
        </ScrollView>
        <DatePickerModal
          visible={showCalendar}
          selectedDate={selectedDate}
          onSelectDate={(d) => setSelectedDate(d)}
          onClose={() => setShowCalendar(false)}
        />
      </View>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        >
          {renderDateNav()}
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.slate300} />
            <Text style={styles.emptyTitle}>Failed to Load</Text>
            <Text style={styles.emptySubtitle}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadReport()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <DatePickerModal
          visible={showCalendar}
          selectedDate={selectedDate}
          onSelectDate={(d) => setSelectedDate(d)}
          onClose={() => setShowCalendar(false)}
        />
      </View>
    );
  }

  if (!report) return null;

  const maxHourly = Math.max(...report.hourlyTimeline.map(h => h.collections), 1);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {/* ── Date Navigation ── */}
        {renderDateNav()}

      {/* ── Vehicle Header Card ── */}
      <View style={styles.vehicleCard}>
        <View style={styles.vehicleHeader}>
          <View style={styles.vehicleDot} />
          <Text style={styles.vehicleName}>{report.vehicleName}</Text>
          <View style={styles.regBadge}>
            <Text style={styles.regText}>{report.registrationNumber}</Text>
          </View>
        </View>
        <Text style={styles.collectorNames}>
          <Text style={styles.collectorNamesLabel}>Collectors: </Text>
          {report.collectorNames}
        </Text>

        {/* Summary Stats Row */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>COLLECTIONS</Text>
            <Text style={styles.summaryValue}>{report.count}</Text>
          </View>
          <View style={[styles.summaryItem, styles.summaryItemBorder]}>
            <Text style={styles.summaryLabel}>WORK TIME</Text>
            <Text style={[styles.summaryValue, { color: Colors.emerald700 }]}>
              {report.count > 0 ? fmtMs(report.totalWorkMs) : '—'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>BREAK TIME</Text>
            <Text style={[styles.summaryValue, { color: '#ea580c' }]}>
              {report.count > 0 ? fmtMs(report.totalBreakMs) : '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Session Report ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>SESSION REPORT</Text>
          <Ionicons name="time-outline" size={16} color={Colors.slate400} />
        </View>

        {report.sessions.length === 0 ? (
          <Text style={styles.noData}>No sessions recorded for this date.</Text>
        ) : (
          <View style={styles.sessionsContainer}>
            {report.sessions.map((session) => {
              const dH = Math.floor(session.durationMs / (1000 * 60 * 60));
              const dM = Math.floor((session.durationMs % (1000 * 60 * 60)) / (1000 * 60));
              const bH = Math.floor(session.breakBeforeMs / (1000 * 60 * 60));
              const bM = Math.floor((session.breakBeforeMs % (1000 * 60 * 60)) / (1000 * 60));

              return (
                <View key={session.index}>
                  {/* Break indicator */}
                  {session.breakBeforeMs > 0 && (
                    <View style={styles.breakIndicator}>
                      <Text style={styles.breakText}>Break: {bH > 0 ? `${bH}h ` : ''}{bM}m</Text>
                    </View>
                  )}

                  {/* Session row */}
                  <View style={styles.sessionRow}>
                    <View style={styles.sessionLeft}>
                      <Text style={styles.sessionIndex}>S{session.index}</Text>
                      <Text style={styles.sessionTime}>
                        {fmtTime(session.startTime)} – {fmtTime(session.endTime)}
                      </Text>
                    </View>
                    <View style={styles.sessionRight}>
                      <View style={styles.sessionStat}>
                        <Text style={styles.sessionStatLabel}>Collections</Text>
                        <Text style={styles.sessionStatValue}>{session.count}</Text>
                      </View>
                      <View style={styles.sessionStat}>
                        <Text style={styles.sessionStatLabel}>Duration</Text>
                        <Text style={[styles.sessionStatValue, { color: Colors.emerald700 }]}>
                          {dH > 0 ? `${dH}h ` : ''}{dM}m
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Hourly Collection Timeline ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>COLLECTION TIMELINE</Text>
          <Ionicons name="bar-chart-outline" size={16} color={Colors.slate400} />
        </View>

        {report.count === 0 ? (
          <Text style={styles.noData}>No collections recorded for this date.</Text>
        ) : (
          <View style={styles.chartContainer}>
            {report.hourlyTimeline.map((item) => {
              const barHeight = item.collections > 0
                ? Math.max((item.collections / maxHourly) * 100, 6)
                : 0;
              return (
                <View key={item.hour} style={styles.chartColumn}>
                  <View style={styles.chartBarWrapper}>
                    {item.collections > 0 && (
                      <Text style={styles.chartBarLabel}>{item.collections}</Text>
                    )}
                    <View
                      style={[
                        styles.chartBar,
                        {
                          height: barHeight,
                          backgroundColor: item.collections > 0 ? Colors.blue500 : 'transparent',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartHourLabel}>{item.hour}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Bottom spacing */}
      <View style={{ height: 100 }} />
      </ScrollView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showCalendar}
        selectedDate={selectedDate}
        onSelectDate={(d) => setSelectedDate(d)}
        onClose={() => setShowCalendar(false)}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },

  // Date navigation
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dateButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  dateButtonDisabled: {
    opacity: 0.35,
  },
  dateSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  dateLabel: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    textAlign: 'center',
  },

  // Vehicle header card
  vehicleCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 6,
  },
  vehicleDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#7c3aed',
  },
  vehicleName: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyBold,
    color: '#581c87',
    flex: 1,
  },
  regBadge: {
    backgroundColor: '#e9d5ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  regText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: '#1e1b4b',
    letterSpacing: 0.3,
  },
  collectorNames: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate600,
    marginBottom: Spacing.sm,
  },
  collectorNamesLabel: {
    fontFamily: Typography.fontFamilySemiBold,
  },
  summaryRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    paddingTop: Spacing.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryItemBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.slate100,
  },
  summaryLabel: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },

  // Generic card
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate500,
    letterSpacing: 1,
  },

  // Sessions
  sessionsContainer: {
    gap: 0,
  },
  breakIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginLeft: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  breakText: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyBold,
    color: '#ea580c',
    letterSpacing: -0.2,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 2,
    borderLeftColor: '#bfdbfe',
    paddingLeft: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginBottom: 4,
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  sessionIndex: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.blue600,
  },
  sessionTime: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate700,
  },
  sessionRight: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  sessionStat: {
    alignItems: 'center',
  },
  sessionStatLabel: {
    fontSize: 9,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    marginBottom: 1,
  },
  sessionStatValue: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },

  // Chart
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 20,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chartBarWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
    width: '100%',
  },
  chartBarLabel: {
    fontSize: 8,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.blue600,
    marginBottom: 2,
  },
  chartBar: {
    width: '55%',
    borderRadius: 3,
    minWidth: 8,
  },
  chartHourLabel: {
    fontSize: 7,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    marginTop: 4,
    letterSpacing: -0.3,
  },

  // Empty states
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate500,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  retryButton: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.emerald600,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
  },
  retryText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.white,
  },
  noData: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
    fontStyle: 'italic',
  },
});
