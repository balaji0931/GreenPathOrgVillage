/**
 * GreenPath Village Manager — Reports Tab: Fleet & Collection Sessions Card
 *
 * - Card Header with "Details" button
 * - Vehicle list: Vehicle Name, Registration Number, Collection Count, Collectors, Start & End times
 * - Tapping "Details" triggers onOpenSessionDetails callback (renders inline, keeping header+nav visible)
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import type { ReportVehicleStat } from '../../../types/manager';

interface ReportsVehiclePerformanceCardProps {
  vehicleStats: ReportVehicleStat[];
  dateLabel: string;
  onOpenSessionDetails?: () => void;
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0h 0m';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
}

function formatTime(isoStr: string | null): string {
  if (!isoStr) return 'N/A';
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'N/A';
  }
}

/* ---------- Main Card ---------- */

export function ReportsVehiclePerformanceCard({
  vehicleStats,
  dateLabel,
  onOpenSessionDetails,
}: ReportsVehiclePerformanceCardProps) {
  const hasVehicles = vehicleStats && vehicleStats.length > 0;

  const handleOpenDetails = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOpenSessionDetails?.();
  };

  return (
    <View style={styles.card}>
      {/* Card Header with "Details" button */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.cardTitle}>COLLECTION PERFORMANCE</Text>
        </View>
        {hasVehicles && (
          <TouchableOpacity
            style={styles.detailsHeaderButton}
            onPress={handleOpenDetails}
            activeOpacity={0.8}
          >
            <Text style={styles.detailsHeaderButtonText}>Details</Text>
          </TouchableOpacity>
        )}
      </View>

      {!hasVehicles ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="car-outline" size={28} color={Colors.slate300} />
          <Text style={styles.emptyText}>No vehicle records logged for this date.</Text>
        </View>
      ) : (
        <View style={styles.vehicleList}>
          {vehicleStats.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.registrationNumber}
              style={styles.vehicleCard}
              onPress={handleOpenDetails}
              activeOpacity={0.85}
            >
              {/* Vehicle Title & Count */}
              <View style={styles.vehicleCardTop}>
                <Text style={styles.vehicleName}>{vehicle.vehicleName}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {vehicle.count} collections
                  </Text>
                </View>
              </View>

              {/* Assigned Collectors */}
              <View style={styles.collectorRow}>
                <Text style={styles.collectorLabel}>Collectors:</Text>
                <Text style={styles.collectorText} numberOfLines={1}>
                  {vehicle.collectorNames || 'None assigned'}
                </Text>
              </View>

              {/* Start & End Times */}
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>
                  Start: {formatTime(vehicle.startTime)}
                </Text>
                <Text style={styles.timeText}>
                  End: {formatTime(vehicle.endTime)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

/* ---------- Session Details (rendered inline by parent) ---------- */

interface SessionDetailsViewProps {
  vehicleStats: ReportVehicleStat[];
  dateLabel: string;
  onBack: () => void;
}

export function SessionDetailsView({
  vehicleStats,
  dateLabel,
  onBack,
}: SessionDetailsViewProps) {
  return (
    <View style={detailStyles.root}>
      {/* Sub-header bar */}
      <View style={detailStyles.topBar}>
        <TouchableOpacity
          style={detailStyles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onBack();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.slate800} />
        </TouchableOpacity>
        <Text style={detailStyles.barTitle} numberOfLines={1}>
          Session Report · {dateLabel}
        </Text>
      </View>

      {/* Sessions List */}
      <ScrollView
        style={detailStyles.scroll}
        contentContainerStyle={detailStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {(!vehicleStats || vehicleStats.length === 0) ? (
          <View style={detailStyles.emptyBox}>
            <Text style={detailStyles.emptyText}>
              No vehicle sessions recorded for this date.
            </Text>
          </View>
        ) : (
          vehicleStats.map((vehicle) => {
            const sessions = vehicle.sessions || [];

            return (
              <View
                key={`detail-${vehicle.registrationNumber}`}
                style={detailStyles.vehicleCard}
              >
                {/* Vehicle Header Bar */}
                <View style={detailStyles.vehicleHeader}>
                  <View style={detailStyles.identityGroup}>
                    <View style={detailStyles.pulseDot} />
                    <Text style={detailStyles.vehicleName}>
                      {vehicle.vehicleName}
                    </Text>
                  </View>
                  <View style={detailStyles.regBadge}>
                    <Text style={detailStyles.regText}>
                      {vehicle.registrationNumber}
                    </Text>
                  </View>
                </View>

                {/* Sessions Timeline */}
                <View style={detailStyles.sessionsContainer}>
                  {sessions.length === 0 ? (
                    <Text style={detailStyles.emptySessionNotice}>
                      No distinct session splits recorded.
                    </Text>
                  ) : (
                    sessions.map((session) => {
                      const start = formatTime(session.startTime);
                      const end = formatTime(session.endTime);
                      const workDuration = formatDuration(session.durationMs);
                      const breakDuration = formatDuration(session.breakBeforeMs);

                      return (
                        <View
                          key={`s-${session.index}`}
                          style={detailStyles.timelineItem}
                        >
                          {/* Break Interval Banner */}
                          {session.breakBeforeMs > 0 && (
                            <View style={detailStyles.breakBadge}>
                              <Text style={detailStyles.breakText}>
                                Break: {breakDuration}
                              </Text>
                            </View>
                          )}

                          <View style={detailStyles.sessionMainRow}>
                            <View style={detailStyles.sessionLeftInfo}>
                              <View style={detailStyles.sessionTag}>
                                <Text style={detailStyles.sessionTagText}>
                                  S{session.index}
                                </Text>
                              </View>
                              <Text style={detailStyles.sessionTimeWindow}>
                                {start} - {end}
                              </Text>
                            </View>

                            <View style={detailStyles.sessionMetricsRow}>
                              <View style={detailStyles.metricCol}>
                                <Text style={detailStyles.metricLabel}>Collections</Text>
                                <Text style={detailStyles.metricVal}>{session.count}</Text>
                              </View>
                              <View style={detailStyles.metricCol}>
                                <Text style={detailStyles.metricLabel}>Work time</Text>
                                <Text style={[detailStyles.metricVal, { color: Colors.emerald700 }]}>
                                  {workDuration}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                {/* 3-Column Summary Footer */}
                <View style={detailStyles.summaryFooter}>
                  <View style={detailStyles.summaryCol}>
                    <Text style={detailStyles.summaryLabel}>TOTAL COLLECTIONS</Text>
                    <Text style={[detailStyles.summaryVal, { color: '#1e3a8a' }]}>
                      {vehicle.count}
                    </Text>
                  </View>
                  <View style={detailStyles.summaryDivider} />
                  <View style={detailStyles.summaryCol}>
                    <Text style={detailStyles.summaryLabel}>TOTAL WORK</Text>
                    <Text style={[detailStyles.summaryVal, { color: Colors.emerald700 }]}>
                      {formatDuration(vehicle.totalWorkMs)}
                    </Text>
                  </View>
                  <View style={detailStyles.summaryDivider} />
                  <View style={detailStyles.summaryCol}>
                    <Text style={detailStyles.summaryLabel}>TOTAL BREAK</Text>
                    <Text style={[detailStyles.summaryVal, { color: '#ea580c' }]}>
                      {formatDuration(vehicle.totalBreakMs)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

/* ---------- Card Styles ---------- */

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.slate200,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.emerald50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate700,
    letterSpacing: 0.8,
  },
  detailsHeaderButton: {
    backgroundColor: '#bbf7d0',
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  detailsHeaderButtonText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: '#14532d',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  emptyText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
    textAlign: 'center',
  },
  vehicleList: {
    gap: Spacing.sm,
  },
  vehicleCard: {
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  vehicleCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  vehicleName: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  countBadge: {
    borderWidth: 1,
    borderColor: Colors.slate300,
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.md,
  },
  countBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate700,
  },
  collectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  collectorLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate600,
  },
  collectorText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.slate200,
    paddingTop: 5,
    marginTop: 2,
  },
  timeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate700,
  },
});

/* ---------- Session Details Styles ---------- */

const detailStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#ecfdf5',
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
    minHeight: 48,
    gap: Spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  barTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  emptyBox: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
  },
  vehicleCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.slate200,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  vehicleHeader: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#7c3aed',
  },
  vehicleName: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: '#581c87',
  },
  regBadge: {
    backgroundColor: '#e9d5ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  regText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: '#3b0764',
  },
  sessionsContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  emptySessionNotice: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    paddingVertical: Spacing.xs,
  },
  timelineItem: {
    borderLeftWidth: 2,
    borderLeftColor: '#bfdbfe',
    paddingLeft: Spacing.sm,
    paddingVertical: 2,
    position: 'relative',
  },
  breakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  breakText: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyBold,
    color: '#ea580c',
    textTransform: 'uppercase',
  },
  sessionMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionLeftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  sessionTag: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  sessionTagText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: '#1d4ed8',
  },
  sessionTimeWindow: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate700,
  },
  sessionMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  metricCol: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 8,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
  },
  metricVal: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate800,
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    backgroundColor: '#f8fafc',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 8,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    letterSpacing: 0.2,
  },
  summaryVal: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    marginTop: 1,
  },
  summaryDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.slate200,
  },
});
