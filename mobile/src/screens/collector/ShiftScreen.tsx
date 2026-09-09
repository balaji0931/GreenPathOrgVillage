/**
 * Shift Screen
 *
 * Attendance and shift lifecycle management for collectors:
 * - Real-time shift state tracking (Shift #1, Shift #2, Shift #3...)
 * - If a shift is in progress: displays shift card with inline "End Shift" button on the right
 * - While a shift is in progress: blocks starting a new shift
 * - When all shifts are ended: displays "Start Shift #(N+1)" button
 * - When zero shifts: displays clean empty state with "Start Shift #1"
 * - Date navigator to view attendance & shift logs for past dates
 * - Guarded by subscription write access (ServiceUnavailableModal)
 */
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Linking,
  ScrollView,
  RefreshControl,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { LoadingState } from '../../components/common/LoadingState';
import { QRScannerModal } from '../../components/scanner/QRScannerModal';
import { DatePickerModal } from '../../components/common/DatePickerModal';
import { ServiceUnavailableModal } from '../../components/common/ServiceUnavailableModal';
import { useSubscription } from '../../hooks/useSubscription';
import {
  fetchShiftState,
  scanShift,
  fetchMyAttendanceStatus,
  type AttendanceStatusResponse,
} from '../../api/collector.api';
import type { ShiftState, ShiftItem, ScanResult } from '../../types/collector';
import { getFriendlyErrorMessage } from '../../utils/errorMessage';

function fmtDateIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDateShort(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('en-IN', { month: 'short' });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatTime(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
}

function formatDuration(startedAt?: string | null, endedAt?: string | null): string {
  if (!startedAt || !endedAt) return '';
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  const diffMinutes = Math.max(1, Math.round((end - start) / (1000 * 60)));
  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getStatusLabel(status?: string | null): string {
  switch (status) {
    case 'present':
      return 'Present';
    case 'half_day':
    case 'halfday':
      return 'Half Day';
    case 'absent':
      return 'Absent';
    default:
      return 'Not Marked';
  }
}

function getStatusBadgeStyle(status?: string | null) {
  switch (status) {
    case 'present':
      return { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' };
    case 'half_day':
    case 'halfday':
      return { backgroundColor: '#fffbeb', borderColor: '#fde68a' };
    case 'absent':
      return { backgroundColor: '#fef2f2', borderColor: '#fecaca' };
    default:
      return { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' };
  }
}

function getStatusDotStyle(status?: string | null) {
  switch (status) {
    case 'present':
      return { backgroundColor: '#059669' };
    case 'half_day':
    case 'halfday':
      return { backgroundColor: '#d97706' };
    case 'absent':
      return { backgroundColor: '#dc2626' };
    default:
      return { backgroundColor: '#94a3b8' };
  }
}

function getStatusTextStyle(status?: string | null) {
  switch (status) {
    case 'present':
      return { color: '#059669' };
    case 'half_day':
    case 'halfday':
      return { color: '#d97706' };
    case 'absent':
      return { color: '#dc2626' };
    default:
      return { color: '#64748b' };
  }
}

export function ShiftScreen() {
  const [shiftState, setShiftState] = useState<ShiftState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceStatusResponse | null>(null);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const { isWriteBlocked } = useSubscription();
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);

  // Check if selected date is today
  const isToday = useMemo(() => {
    const todayStr = fmtDateIso(new Date());
    return fmtDateIso(selectedDate) === todayStr;
  }, [selectedDate]);

  // Load shifts for chosen date
  const loadShifts = useCallback(async (date: Date = selectedDate) => {
    try {
      const data = await fetchShiftState(fmtDateIso(date));
      setShiftState(data);
    } catch {
      // silent fallback
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedDate]);

  // Load attendance status for chosen date
  const loadAttendance = useCallback(async (date: Date = selectedDate) => {
    setIsAttendanceLoading(true);
    try {
      const res = await fetchMyAttendanceStatus(fmtDateIso(date));
      setAttendance(res);
    } catch {
      // silent fallback
    } finally {
      setIsAttendanceLoading(false);
    }
  }, [selectedDate]);

  // Fetch when selectedDate changes
  useEffect(() => {
    loadShifts(selectedDate);
    loadAttendance(selectedDate);
  }, [selectedDate, loadShifts, loadAttendance]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadShifts(selectedDate),
      loadAttendance(selectedDate),
    ]);
    setIsRefreshing(false);
  }, [selectedDate, loadShifts, loadAttendance]);

  // Date stepper
  const handleDateStep = (offset: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + offset);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (next <= today) {
      setSelectedDate(next);
    }
  };

  // Trigger scanning action
  const triggerScanAction = () => {
    if (isWriteBlocked) {
      setShowUnavailableModal(true);
      return;
    }
    setShowScanner(true);
  };

  // Handle successful QR scan
  const handleScan = async (result: ScanResult) => {
    setShowScanner(false);
    if (isWriteBlocked) {
      setShowUnavailableModal(true);
      return;
    }
    if (result.kind !== 'attendance') {
      Alert.alert('Invalid QR', 'Please scan an attendance QR code provided at your facility.');
      return;
    }

    setIsScanning(true);
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!canAskAgain) {
          Alert.alert(
            'Location Permission Required',
            'Location access was denied. Please enable location permissions in Settings to verify facility proximity.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
        } else {
          Alert.alert('Permission Required', 'GPS location is required to verify check-in at the facility.');
        }
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const response = await scanShift({
        qrToken: result.token,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (response.error === 'too_far') {
        Alert.alert(
          'Outside Facility Radius',
          `You are ${response.distance}m from ${response.centerName || 'the center'}. You must be within ${response.maxDistance}m to mark attendance.`,
        );
      } else {
        const isStart = response.eventType === 'shift_start';
        Alert.alert(
          isStart ? 'Shift Started' : 'Shift Ended',
          `Shift #${response.shiftNumber} successfully ${isStart ? 'started' : 'ended'} at ${response.centerName} (${response.distance}m away).`,
        );
        // Instant reload of shift state & attendance
        loadShifts(selectedDate);
        loadAttendance(selectedDate);
      }
    } catch (err: any) {
      Alert.alert('Notice', getFriendlyErrorMessage(err, 'Failed to process shift scan. Please try again.'));
    } finally {
      setIsScanning(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading shift records..." />;

  const shifts: ShiftItem[] = shiftState?.shifts || [];
  const isShiftActive = Boolean(shiftState?.isShiftActive);
  const activeShift = isShiftActive ? shifts.find((s) => !s.endedAt) : null;
  const completedCount = shifts.filter((s) => Boolean(s.endedAt)).length;
  const nextShiftNumber = shifts.length > 0 ? shifts[shifts.length - 1].shiftNumber + 1 : 1;

  return (
    <View style={styles.container}>
      {/* Fixed Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Shifts</Text>
          <Text style={styles.subtitle}>Daily attendance and shift logs</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors.emerald600]}
          />
        }
      >
        {/* Date Navigator & Attendance Summary Card */}
        <View style={styles.dateCard}>
          {/* Row 1: Date Navigation */}
          <View style={styles.dateNavRow}>
            <TouchableOpacity
              style={styles.dateStepBtn}
              onPress={() => handleDateStep(-1)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={18} color={Colors.slate700} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.datePickerTrigger}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar" size={16} color={Colors.emerald600} style={{ marginRight: 6 }} />
              <Text style={styles.datePickerText}>{fmtDateShort(selectedDate)}</Text>
              {isToday && (
                <View style={styles.todayTag}>
                  <Text style={styles.todayTagText}>Today</Text>
                </View>
              )}
              <Ionicons name="chevron-down" size={12} color={Colors.slate400} style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateStepBtn, isToday && styles.dateStepBtnDisabled]}
              onPress={() => handleDateStep(1)}
              disabled={isToday}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-forward" size={18} color={isToday ? Colors.slate300 : Colors.slate700} />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Row 2: Attendance Badge */}
          <View style={styles.attendanceRow}>
            <Text style={styles.attendanceLabel}>Attendance Status</Text>
            {isAttendanceLoading ? (
              <ActivityIndicator size="small" color={Colors.emerald600} />
            ) : (
              <View style={[styles.statusBadge, getStatusBadgeStyle(attendance?.status)]}>
                <View style={[styles.statusDot, getStatusDotStyle(attendance?.status)]} />
                <Text style={[styles.statusBadgeText, getStatusTextStyle(attendance?.status)]}>
                  {getStatusLabel(attendance?.status)}
                </Text>
              </View>
            )}
          </View>

          {/* Optional Remarks Note */}
          {attendance?.remarks ? (
            <View style={styles.remarksBox}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.slate500} style={{ marginRight: 4 }} />
              <Text style={styles.remarksText} numberOfLines={2}>
                {attendance.remarks}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Shifts List & Action Center ────────────────────────── */}
        {shifts.length === 0 ? (
          /* CASE 1: Zero Shifts on this date */
          <View style={styles.emptyShiftsCard}>
            <View style={styles.clockCircle}>
              <Ionicons name="time-outline" size={32} color={Colors.slate400} />
            </View>
            <Text style={styles.emptyTitle}>
              {isToday ? 'No Active Shift' : 'No Shifts Recorded'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isToday
                ? 'Scan the attendance QR code at your facility to start duty.'
                : 'No shifts were logged for this selected date.'}
            </Text>

            {isToday && (
              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={triggerScanAction}
                disabled={isScanning}
                activeOpacity={0.8}
              >
                {isScanning ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="camera" size={20} color={Colors.white} style={{ marginRight: 8 }} />
                    <Text style={styles.primaryActionButtonText}>Start Shift #1</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* CASE 2: One or More Shifts Recorded */
          <View style={styles.shiftsSection}>
            {/* Section Header */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {isToday ? 'TODAY’S SHIFTS' : 'RECORDED SHIFTS'} ({shifts.length})
              </Text>
              <View style={styles.summaryBadge}>
                <Text style={styles.summaryBadgeText}>
                  {isShiftActive
                    ? `${completedCount} Done · 1 In Progress`
                    : `${completedCount} Completed`}
                </Text>
              </View>
            </View>

            {/* List of Shift Cards */}
            <View style={styles.shiftsList}>
              {shifts.map((shift) => {
                const isActive = !shift.endedAt;
                const durationText = formatDuration(shift.startedAt, shift.endedAt);

                return (
                  <View
                    key={shift.shiftNumber}
                    style={[
                      styles.shiftCard,
                      isActive ? styles.shiftCardActive : styles.shiftCardCompleted,
                    ]}
                  >
                    {/* Card Header: Shift Number + Status Badge on left, Action/Duration on right */}
                    <View style={styles.shiftCardHeader}>
                      {/* Left: Shift info & status tag */}
                      <View style={styles.shiftHeaderLeft}>
                        <Text style={styles.shiftNumberTitle}>Shift #{shift.shiftNumber}</Text>
                        {isActive ? (
                          <View style={styles.activeTag}>
                            <View style={styles.pulsingDot} />
                            <Text style={styles.activeTagText}>IN PROGRESS</Text>
                          </View>
                        ) : (
                          <View style={styles.completedTag}>
                            <Ionicons name="checkmark" size={12} color="#1d4ed8" style={{ marginRight: 2 }} />
                            <Text style={styles.completedTagText}>Completed</Text>
                          </View>
                        )}
                      </View>

                      {/* Right: End Shift Button (if active) OR Duration Badge (if completed) */}
                      {isActive && isToday ? (
                        <TouchableOpacity
                          style={styles.inlineEndShiftButton}
                          onPress={triggerScanAction}
                          disabled={isScanning}
                          activeOpacity={0.8}
                        >
                          {isScanning ? (
                            <ActivityIndicator size="small" color={Colors.white} />
                          ) : (
                            <>
                              <Ionicons name="camera" size={15} color={Colors.white} style={{ marginRight: 4 }} />
                              <Text style={styles.inlineEndShiftText}>End Shift</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      ) : durationText ? (
                        <View style={styles.durationTag}>
                          <Ionicons name="time-outline" size={12} color={Colors.slate600} style={{ marginRight: 3 }} />
                          <Text style={styles.durationTagText}>{durationText}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Card Time Timeline */}
                    <View style={styles.timelineRow}>
                      <View style={styles.timePoint}>
                        <View style={[styles.timePointDot, { backgroundColor: Colors.emerald600 }]} />
                        <Text style={styles.timePointLabel}>Started:</Text>
                        <Text style={styles.timePointValue}>{formatTime(shift.startedAt)}</Text>
                      </View>

                      <View style={styles.timePointArrow}>
                        <Ionicons name="arrow-forward" size={12} color={Colors.slate400} />
                      </View>

                      <View style={styles.timePoint}>
                        <View
                          style={[
                            styles.timePointDot,
                            { backgroundColor: isActive ? Colors.amber600 : Colors.blue600 },
                          ]}
                        />
                        <Text style={styles.timePointLabel}>Ended:</Text>
                        <Text
                          style={[
                            styles.timePointValue,
                            isActive && { color: Colors.amber600, fontFamily: Typography.fontFamilySemiBold },
                          ]}
                        >
                          {isActive ? 'In progress' : formatTime(shift.endedAt)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* ── Bottom Action Button Control ── */}
            {isToday && (
              isShiftActive ? (
                /* Shift in progress: Cannot start new shift */
                <View style={styles.activeShiftHintBox}>
                  <Ionicons name="information-circle" size={18} color={Colors.emerald700} style={{ marginRight: 8 }} />
                  <Text style={styles.activeShiftHintText}>
                    Shift #{activeShift?.shiftNumber} is currently active. Please end it before starting a new shift.
                  </Text>
                </View>
              ) : (
                /* All shifts ended: Allow starting next shift */
                <TouchableOpacity
                  style={styles.startNextShiftButton}
                  onPress={triggerScanAction}
                  disabled={isScanning}
                  activeOpacity={0.8}
                >
                  {isScanning ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={20} color={Colors.white} style={{ marginRight: 8 }} />
                      <Text style={styles.startNextShiftButtonText}>
                        Start Shift #{nextShiftNumber}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )
            )}
          </View>
        )}
      </ScrollView>

      {/* QR Scanner */}
      <QRScannerModal
        visible={showScanner}
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
        scanMode="attendance"
      />

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        selectedDate={selectedDate}
        onSelectDate={(newDate) => {
          setSelectedDate(newDate);
        }}
        onClose={() => setShowDatePicker(false)}
      />

      {/* Subscription Expired / Write Blocked Modal */}
      <ServiceUnavailableModal
        visible={showUnavailableModal}
        actionType="shift"
        onDismiss={() => setShowUnavailableModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.background,
    zIndex: 10,
  },
  title: {
    fontSize: 20,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    marginTop: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl + 40,
    gap: Spacing.md,
  },

  // ── Date & Attendance Card ────────────────────────────────────
  dateCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateStepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.slate100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateStepBtnDisabled: {
    opacity: 0.4,
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  datePickerText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate800,
  },
  todayTag: {
    backgroundColor: Colors.emerald50,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  todayTagText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
    textTransform: 'uppercase',
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.slate100,
    marginVertical: Spacing.sm,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attendanceLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
  },
  remarksBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  remarksText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate600,
    flex: 1,
  },

  // ── Empty State ───────────────────────────────────────────────
  emptyShiftsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
    marginTop: Spacing.xs,
  },
  clockCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate800,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.lg,
    maxWidth: 260,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.emerald600,
    width: '100%',
    height: 48,
    borderRadius: BorderRadius.xl,
    ...Shadows.emeraldGlow,
  },
  primaryActionButtonText: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },

  // ── Shifts Section & Cards ────────────────────────────────────
  shiftsSection: {
    gap: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate500,
    letterSpacing: 0.6,
  },
  summaryBadge: {
    backgroundColor: Colors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  summaryBadgeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate600,
  },
  shiftsList: {
    gap: Spacing.sm + 2,
  },
  shiftCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    ...Shadows.sm,
  },
  shiftCardActive: {
    borderColor: '#10b981',
    borderLeftWidth: 5,
    borderLeftColor: '#059669',
    backgroundColor: '#ffffff',
  },
  shiftCardCompleted: {
    borderColor: Colors.slate200,
  },
  shiftCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  shiftHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  shiftNumberTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  activeTagText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: '#059669',
    letterSpacing: 0.5,
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  completedTagText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: '#1d4ed8',
  },
  inlineEndShiftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.lg,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  inlineEndShiftText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
  durationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  durationTagText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate700,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 8,
  },
  timePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timePointDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timePointLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
  },
  timePointValue: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate800,
  },
  timePointArrow: {
    marginHorizontal: Spacing.sm,
  },

  // ── Bottom Buttons / Hints ────────────────────────────────────
  startNextShiftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.greenPrimary,
    width: '100%',
    height: 48,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.xs,
    shadowColor: Colors.greenPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  startNextShiftButtonText: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
  activeShiftHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  activeShiftHintText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: '#065f46',
    lineHeight: 17,
  },
});
