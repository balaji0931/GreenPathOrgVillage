/**
 * Shift Screen
 * Attendance/shift management with QR scanner and GPS.
 * Matches web collector-dashboard.tsx shift tab exactly.
 */
import { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, Linking, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState } from '../../components/common/LoadingState';
import { QRScannerModal } from '../../components/scanner/QRScannerModal';
import { fetchShiftState, scanShift } from '../../api/collector.api';
import type { ShiftState, ScanResult } from '../../types/collector';
import { getFriendlyErrorMessage } from '../../utils/errorMessage';

export function ShiftScreen() {
  const [shiftState, setShiftState] = useState<ShiftState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchShiftState();
      setShiftState(data);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleScan = async (result: ScanResult) => {
    setShowScanner(false);
    if (result.kind !== 'attendance') {
      Alert.alert('Invalid QR', 'Please scan an attendance QR code.');
      return;
    }

    setIsScanning(true);
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!canAskAgain) {
          Alert.alert(
            'Location Permission',
            'Location access was denied. Please enable it in Settings for shift check-in.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
        } else {
          Alert.alert('Permission Required', 'Location permission is needed for shift check-in.');
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
        Alert.alert('Too Far', `You are ${response.distance}m from the center. Maximum allowed: ${response.maxDistance}m.`);
      } else {
        Alert.alert(
          response.eventType === 'shift_start' ? 'Shift Started' : 'Shift Ended',
          `Shift #${response.shiftNumber} ${response.eventType === 'shift_start' ? 'started' : 'ended'} at ${response.centerName} (${response.distance}m away)`,
        );
        loadData();
      }
    } catch (err: any) {
      Alert.alert('Notice', getFriendlyErrorMessage(err, 'Failed to process shift scan. Please try again.'));
    } finally {
      setIsScanning(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading shift data..." />;

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <View style={styles.container}>
      {/* Fixed Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Shifts</Text>
          <Text style={styles.subtitle}>Daily attendance and work shifts</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date Header */}
        <View style={styles.dateCard}>
          <Ionicons name="calendar-outline" size={18} color={Colors.emerald600} />
          <Text style={styles.dateText}>{today}</Text>
        </View>

        {/* Current State Card */}
        <View style={[styles.stateCard, shiftState?.hasActiveShift && styles.stateCardActive]}>
          {shiftState?.hasActiveShift ? (
            <View style={styles.activeStateCol}>
              <View style={styles.onDutyBadge}>
                <View style={styles.pulsingDot} />
                <Text style={styles.onDutyText}>ON DUTY</Text>
              </View>
              <Text style={styles.shiftNumberText}>
                Shift #{shiftState.currentShift?.shiftNumber}
              </Text>
              <Text style={styles.shiftTimeText}>
                Started at {new Date(shiftState.currentShift?.startTime || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
              </Text>

              <TouchableOpacity
                style={styles.endShiftButton}
                onPress={() => setShowScanner(true)}
                disabled={isScanning}
                activeOpacity={0.8}
              >
                {isScanning ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="camera" size={22} color={Colors.white} />
                    <Text style={styles.endShiftButtonText}>Scan QR to End Shift</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noShiftCol}>
              <View style={styles.clockCircle}>
                <Ionicons name="time" size={32} color={Colors.slate400} />
              </View>
              <Text style={styles.noShiftTitle}>
                {(shiftState?.completedShifts ?? 0) > 0
                  ? `${shiftState!.completedShifts} Shift${shiftState!.completedShifts > 1 ? 's' : ''} Completed`
                  : 'No Active Shift'}
              </Text>
              <Text style={styles.noShiftSubtitle}>
                Scan attendance QR code at the facility to start duty
              </Text>

              <TouchableOpacity
                style={styles.startShiftButton}
                onPress={() => setShowScanner(true)}
                disabled={isScanning}
                activeOpacity={0.8}
              >
                {isScanning ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="camera" size={22} color={Colors.white} />
                    <Text style={styles.startShiftButtonText}>Start Shift</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Shift Timeline */}
        {(shiftState?.todayShifts ?? []).length > 0 && (
          <View style={styles.timelineSection}>
            <Text style={styles.timelineSectionTitle}>TODAY'S SHIFTS</Text>
            {shiftState!.todayShifts.map((shift, idx) => (
              <View key={idx} style={styles.timelineCard}>
                <View style={styles.timelineLeft}>
                  <Text style={styles.timelineShiftNumber}>Shift #{shift.shiftNumber}</Text>
                  <Text style={styles.timelineTimeRange}>
                    {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    {' → '}
                    {shift.endTime
                      ? new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                      : 'Active'}
                  </Text>
                </View>
                <View style={styles.timelineRight}>
                  {shift.duration != null ? (
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationBadgeText}>{shift.duration} min</Text>
                    </View>
                  ) : (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
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
    paddingBottom: Spacing.sm,
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
    color: Colors.slate400,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxl + 32,
    gap: Spacing.md,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  dateText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate700,
  },
  stateCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  stateCardActive: {
    borderColor: Colors.emerald100,
    backgroundColor: '#ffffff',
  },
  activeStateCol: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.emerald500,
  },
  onDutyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.emerald50,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  onDutyText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
    letterSpacing: 0.8,
  },
  shiftNumberText: {
    fontSize: 22,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    marginTop: 4,
  },
  shiftTimeText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
  },
  endShiftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.destructive,
    width: '100%',
    height: 52,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.md,
    shadowColor: Colors.destructive,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  endShiftButtonText: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
  noShiftCol: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  clockCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  noShiftTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate800,
  },
  noShiftSubtitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    textAlign: 'center',
    maxWidth: 260,
  },
  startShiftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.emerald600,
    width: '100%',
    height: 52,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.md,
    ...Shadows.emeraldGlow,
  },
  startShiftButtonText: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
  timelineSection: {
    gap: Spacing.sm,
  },
  timelineSectionTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    letterSpacing: 0.6,
  },
  timelineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md + 2,
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  timelineLeft: {
    gap: 3,
  },
  timelineShiftNumber: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  timelineTimeRange: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
  },
  timelineRight: {
    alignItems: 'flex-end',
  },
  durationBadge: {
    backgroundColor: Colors.blue50,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.blue100,
  },
  durationBadgeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.blue600,
  },
  activeBadge: {
    backgroundColor: Colors.emerald50,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  activeBadgeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.emerald600,
  },
});
