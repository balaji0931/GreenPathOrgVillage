/**
 * Field Worker Dashboard — Main Orchestrator
 *
 * Coordinates:
 * - Tab switching: Home (Digitize / Search by UID), Sync (Offline Queue), Profile (Account)
 * - Clean Brand Header (Logo, Online/Offline status pill, Logout button)
 * - Subscription banner & write blocking
 * - QR scanner & duplicate validation (offline SQLite + online API)
 * - Search by UID manual lookup & mapping for damaged stickers
 * - Household Mapping Form modal (with GPS & OSM static preview)
 * - Mapped QR details modal for already-claimed stickers
 * - Sequential background sync engine lifecycle
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  RefreshControl,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

// Components
import { FieldWorkerHeader } from '../../components/fieldworker/FieldWorkerHeader';
import { FieldWorkerBottomNav } from '../../components/fieldworker/FieldWorkerBottomNav';
import { FieldWorkerStatsCard } from '../../components/fieldworker/FieldWorkerStatsCard';
import { HouseholdMappingModal } from '../../components/fieldworker/HouseholdMappingModal';
import { MappedQRModal } from '../../components/fieldworker/MappedQRModal';
import { QRScannerModal, type ScanResult } from '../../components/common/QRScannerModal';
import { SubscriptionBanner } from '../../components/common/SubscriptionBanner';
import { ServiceUnavailableModal } from '../../components/common/ServiceUnavailableModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

// Screens
import { FieldWorkerSyncQueueScreen } from './FieldWorkerSyncQueueScreen';
import { FieldWorkerProfileScreen } from './FieldWorkerProfileScreen';

// Hooks & Services
import { useNetwork } from '../../hooks/useNetwork';
import { useSubscription } from '../../hooks/useSubscription';
import { useAuth } from '../../auth/AuthProvider';
import {
  initFieldWorkerSyncEngine,
  stopFieldWorkerSyncEngine,
  triggerFieldWorkerSync,
  onFieldWorkerSyncStatsChange,
} from '../../services/fieldworker-sync';
import {
  isQRAlreadyMappedLocally,
  getTodayMappedCount,
  getFieldWorkerQueueStats,
  getCachedFieldWorkerVillageData,
  saveCachedFieldWorkerVillageData,
  getCachedHouseholdTypes,
  saveCachedHouseholdTypes,
  getCachedVillageRoads,
  saveCachedVillageRoads,
} from '../../services/fieldworker-queue';
import {
  lookupQRCode,
  fetchVillageDetails,
  fetchHouseholdTypes,
  fetchVillageRoads,
} from '../../api/fieldworker.api';
import { getFriendlyErrorMessage } from '../../utils/errorMessage';
import type {
  FieldWorkerTab,
  MappedHousehold,
  QRCodeData,
  FieldWorkerQueueStats,
  FieldWorkerVillageData,
  HouseholdTypeOption,
  VillageRoad,
  FieldWorkerStats,
} from '../../types/fieldworker';

export function FieldWorkerDashboard() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { isConnected } = useNetwork();
  const { isWriteBlocked, refresh: refreshSub } = useSubscription();

  // Tab State
  const [activeTab, setActiveTab] = useState<FieldWorkerTab>('home');
  const [searchUid, setSearchUid] = useState('');

  // Data State
  const [todayMapped, setTodayMapped] = useState<number>(0);
  const [villageData, setVillageData] = useState<FieldWorkerVillageData | null>(null);
  const [householdTypes, setHouseholdTypes] = useState<HouseholdTypeOption[]>([]);
  const [villageRoads, setVillageRoads] = useState<VillageRoad[]>([]);
  const [syncStats, setSyncStats] = useState<FieldWorkerQueueStats>({
    total: 0,
    queued: 0,
    syncing: 0,
    confirmed: 0,
    failed: 0,
  });

  // UI / Modal States
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mappingSuccess, setMappingSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [targetQrUid, setTargetQrUid] = useState('');
  const [showMappedQRModal, setShowMappedQRModal] = useState(false);
  const [selectedMappedQR, setSelectedMappedQR] = useState<QRCodeData | null>(null);
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isVerifyingQR, setIsVerifyingQR] = useState(false);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // ── Sync Engine Lifecycle ──────────────────────────────────────

  useEffect(() => {
    // 1. Start sync engine
    initFieldWorkerSyncEngine();

    // 2. Initial load of stats from SQLite queue
    try {
      setTodayMapped(getTodayMappedCount());
      setSyncStats(getFieldWorkerQueueStats());
    } catch {
      // silent
    }

    // 3. Listen to sync stats changes
    const unsubscribe = onFieldWorkerSyncStatsChange((stats) => {
      setSyncStats(stats);
      try {
        setTodayMapped(getTodayMappedCount());
      } catch {
        // silent
      }
    });

    return () => {
      unsubscribe();
      stopFieldWorkerSyncEngine();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  // Trigger sync on network reconnect
  useEffect(() => {
    if (isConnected) {
      triggerFieldWorkerSync();
    }
  }, [isConnected]);

  // Load Village Data and Household Types (Cache first, then network)
  const loadMetadata = useCallback(async () => {
    const villageId = user?.villageId || '';
    if (!villageId) return;

    // Load from SQLite cache immediately
    const cachedVillage = getCachedFieldWorkerVillageData(villageId);
    if (cachedVillage) setVillageData(cachedVillage);

    const cachedTypes = getCachedHouseholdTypes(villageId);
    if (cachedTypes && cachedTypes.length > 0) setHouseholdTypes(cachedTypes);

    const cachedRoads = getCachedVillageRoads(villageId);
    if (cachedRoads && cachedRoads.length > 0) setVillageRoads(cachedRoads);

    // If online, update cache from API
    if (isConnected) {
      try {
        const [vData, hTypes, vRoads] = await Promise.all([
          fetchVillageDetails(villageId).catch(() => null),
          fetchHouseholdTypes().catch(() => []),
          fetchVillageRoads().catch(() => []),
        ]);

        if (vData) {
          setVillageData(vData);
          saveCachedFieldWorkerVillageData(villageId, vData);
        }
        if (hTypes && hTypes.length > 0) {
          setHouseholdTypes(hTypes);
          saveCachedHouseholdTypes(villageId, hTypes);
        }
        if (vRoads && vRoads.length > 0) {
          setVillageRoads(vRoads);
          saveCachedVillageRoads(villageId, vRoads);
        }
      } catch {
        // use cached
      }
    }
  }, [user?.villageId, isConnected]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadMetadata(),
      refreshSub(),
    ]);
    try {
      setTodayMapped(getTodayMappedCount());
      setSyncStats(getFieldWorkerQueueStats());
    } catch {
      // silent
    }
    if (isConnected) {
      triggerFieldWorkerSync();
    }
    setIsRefreshing(false);
  }, [loadMetadata, refreshSub, isConnected]);

  // ── Stats Calculations ─────────────────────────────────────────

  const pendingCount = syncStats.queued + syncStats.syncing + syncStats.failed;

  const stats: FieldWorkerStats = useMemo(() => ({
    totalMapped: todayMapped,
    todayMapped: todayMapped,
    pendingSync: pendingCount,
  }), [todayMapped, pendingCount]);

  // ── UID Validation & Village Extraction ─────────────────────────

  const validateUidFormat = (uid: string): boolean => {
    const clean = uid.trim().toUpperCase();
    const uidPatternWithPrefix = /^GEN-[A-Z0-9_-]+-H\d+$/;
    const uidPatternWithoutPrefix = /^[A-Z0-9_-]+-H\d+$/;
    return uidPatternWithPrefix.test(clean) || uidPatternWithoutPrefix.test(clean);
  };

  const extractVillageIdFromUid = (uid: string): string | null => {
    const clean = uid.trim().toUpperCase().replace(/^GEN-/, '');
    const lastDashHIndex = clean.lastIndexOf('-H');
    if (lastDashHIndex === -1) return null;
    return clean.substring(0, lastDashHIndex);
  };

  // ── Manual UID Lookup & Mapping ────────────────────────────────

  const handleSearchByUid = async () => {
    const trimmedUid = searchUid.trim().toUpperCase();
    if (!trimmedUid) {
      Alert.alert('Invalid Input', 'Please enter a QR code UID.');
      return;
    }
    if (!validateUidFormat(trimmedUid)) {
      Alert.alert(
        'Invalid Format',
        'UID must be in format V001-H0001 or GEN-V001-H0001'
      );
      return;
    }

    // Validate village ID (works offline & online)
    const userVillageId = user?.villageId?.trim().toUpperCase();
    const extractedVillageId = extractVillageIdFromUid(trimmedUid);
    if (userVillageId && extractedVillageId && extractedVillageId !== userVillageId) {
      Alert.alert(
        'Village Mismatch',
        `This QR code belongs to village "${extractedVillageId}", but you are assigned to "${user?.villageId}".\n\nPlease use a QR code sticker issued for your village.`
      );
      return;
    }

    if (isWriteBlocked) {
      setShowUnavailableModal(true);
      return;
    }

    // 1. Check local offline queue first
    if (isQRAlreadyMappedLocally(trimmedUid)) {
      setSelectedMappedQR({
        uid: trimmedUid,
        villageId: user?.villageId || '',
        status: 'mapped',
      });
      setShowMappedQRModal(true);
      return;
    }

    // 2. If online, verify QR code status with server
    if (isConnected) {
      setIsVerifyingQR(true);
      try {
        const qrData = await lookupQRCode(trimmedUid);
        setIsVerifyingQR(false);

        if (qrData.status === 'mapped') {
          setSelectedMappedQR(qrData);
          setShowMappedQRModal(true);
          return;
        }

        // Available! Open mapping form
        setTargetQrUid(trimmedUid);
        setShowMappingModal(true);
      } catch (err: any) {
        setIsVerifyingQR(false);
        Alert.alert(
          'QR Code Not Found',
          getFriendlyErrorMessage(err, "This QR code does not exist or doesn't belong to your organization.")
        );
      }
    } else {
      // 3. Offline: format and village verified, not in local queue -> proceed directly
      setTargetQrUid(trimmedUid);
      setShowMappingModal(true);
    }
  };

  // ── QR Camera Scanner Workflow ─────────────────────────────────

  const handleOpenScanner = () => {
    if (isWriteBlocked) {
      setShowUnavailableModal(true);
      return;
    }
    setShowScanner(true);
  };

  const handleScan = async (result: ScanResult) => {
    if (result.kind !== 'household') {
      Alert.alert('Invalid QR Code', 'The scanned QR code is not a valid household mapping code.');
      return;
    }

    const scannedUid = result.uid.trim().toUpperCase();
    setShowScanner(false);

    // Format validation
    if (!validateUidFormat(scannedUid)) {
      Alert.alert('Invalid Format', 'The scanned QR code UID does not match the GreenPath format.');
      return;
    }

    // Validate village ID (works offline & online)
    const userVillageId = user?.villageId?.trim().toUpperCase();
    const extractedVillageId = extractVillageIdFromUid(scannedUid);
    if (userVillageId && extractedVillageId && extractedVillageId !== userVillageId) {
      Alert.alert(
        'Village Mismatch',
        `This QR code belongs to village "${extractedVillageId}", but you are assigned to "${user?.villageId}".\n\nPlease scan a QR code sticker issued for your village.`
      );
      return;
    }

    // 1. Check local SQLite duplicate first
    if (isQRAlreadyMappedLocally(scannedUid)) {
      setSelectedMappedQR({
        uid: scannedUid,
        villageId: user?.villageId || '',
        status: 'mapped',
      });
      setShowMappedQRModal(true);
      return;
    }

    // 2. If online, verify QR code status with server
    if (isConnected) {
      setIsVerifyingQR(true);
      try {
        const qrData = await lookupQRCode(scannedUid);
        setIsVerifyingQR(false);

        if (qrData.status === 'mapped') {
          setSelectedMappedQR(qrData);
          setShowMappedQRModal(true);
          return;
        }

        // Available! Open mapping form
        setTargetQrUid(scannedUid);
        setShowMappingModal(true);
      } catch (err: any) {
        setIsVerifyingQR(false);
        Alert.alert(
          'QR Verification',
          getFriendlyErrorMessage(err, "This QR code does not exist or doesn't belong to your organization.")
        );
      }
    } else {
      // 3. If offline, proceed directly
      setTargetQrUid(scannedUid);
      setShowMappingModal(true);
    }
  };

  const handleMappingSuccess = (newHousehold: MappedHousehold) => {
    setShowMappingModal(false);
    setSearchUid('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(`Mapped House #${newHousehold.houseNumber} (${newHousehold.headName})`);

    // Show web-style success banner
    setMappingSuccess(true);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => {
      setMappingSuccess(false);
    }, 4000);

    // Update stats directly from queue
    try {
      setTodayMapped(getTodayMappedCount());
      setSyncStats(getFieldWorkerQueueStats());
    } catch {
      // silent
    }
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    try {
      await logout();
    } catch {
      // silent
    }
  };

  // ── Render Home Content (Matching Web App) ──────────────────────

  const renderHomeContent = () => (
    <ScrollView
      style={styles.homeScroll}
      contentContainerStyle={styles.homeScrollContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[Colors.emerald700]}
          tintColor={Colors.emerald700}
        />
      }
    >
      {/* Overview Stats Cards (Customized 2-card layout) */}
      <FieldWorkerStatsCard stats={stats} />

      {/* Hero Header */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>Map Household</Text>
        <Text style={styles.heroSubtitle}>Scan QR or search by UID to map household</Text>
      </View>

      {/* Success Banner */}
      {mappingSuccess && (
        <View style={styles.successBanner}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-circle" size={22} color={Colors.emerald600} />
          </View>
          <View style={styles.successTextContainer}>
            <Text style={styles.successTitle}>Mapped Successfully!</Text>
            <Text style={styles.successSubtitle}>QR code linked to household</Text>
          </View>
        </View>
      )}

      {/* Search by UID Card */}
      <View style={styles.cardSearch}>
        <View style={styles.cardSearchHeader}>
          <View style={styles.searchIconCircle}>
            <Ionicons name="search" size={20} color="#2563eb" />
          </View>
          <Text style={styles.cardSearchTitle}>Search by UID</Text>
        </View>

        <View style={styles.uidInputContainer}>
          <TextInput
            style={styles.uidInput}
            placeholder="Enter UID (e.g., V001-H0001)"
            placeholderTextColor={Colors.slate400}
            value={searchUid}
            onChangeText={(text) => setSearchUid(text.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleSearchByUid}
          />
          {searchUid.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchUid('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={18} color={Colors.slate400} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.mapButton, (!searchUid.trim() || isVerifyingQR) && styles.mapButtonDisabled]}
          onPress={handleSearchByUid}
          disabled={!searchUid.trim() || isVerifyingQR}
          activeOpacity={0.85}
        >
          {isVerifyingQR ? (
            <View style={styles.buttonLoadingRow}>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.mapButtonText}>Looking up...</Text>
            </View>
          ) : (
            <View style={styles.buttonContentRow}>
              <Ionicons name="search" size={18} color="#ffffff" />
              <Text style={styles.mapButtonText}>Map Household</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* How it works Card */}
      <View style={styles.cardHowItWorks}>
        <Text style={styles.howItWorksTitle}>HOW IT WORKS</Text>
        <View style={styles.stepsList}>
          <View style={styles.stepItem}>
            <View style={styles.stepNumberCircle}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Ionicons name="camera-outline" size={20} color={Colors.slate400} style={styles.stepIcon} />
            <Text style={styles.stepText}>Scan QR or type UID above</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumberCircle}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Ionicons name="home-outline" size={20} color={Colors.slate400} style={styles.stepIcon} />
            <Text style={styles.stepText}>Fill household details</Text>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.stepNumberCircle}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Ionicons name="checkmark-outline" size={20} color={Colors.slate400} style={styles.stepIcon} />
            <Text style={styles.stepText}>Preview & confirm mapping</Text>
          </View>
        </View>
      </View>

      {/* Offline Queue Quick Banner (if pending items exist) */}
      {pendingCount > 0 && (
        <TouchableOpacity
          style={styles.queueBanner}
          onPress={() => setActiveTab('sync')}
          activeOpacity={0.8}
        >
          <View style={styles.queueBannerLeft}>
            <View style={styles.queueBadgeCircle}>
              <Ionicons name="cloud-upload" size={16} color={Colors.amber600} />
            </View>
            <View>
              <Text style={styles.queueBannerTitle}>
                {pendingCount} Mapping{pendingCount > 1 ? 's' : ''} Stored Offline
              </Text>
              <Text style={styles.queueBannerSubtitle}>Will auto-sync once connected to network</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.slate400} />
        </TouchableOpacity>
      )}

      {/* Spacer for bottom nav clearance */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.greenPrimary} />
      {/* Safe Area Top Fill */}
      <View style={{ height: insets.top, backgroundColor: Colors.greenPrimary }} />

      {/* Top Clean Brand Header */}
      <FieldWorkerHeader
        isOnline={isConnected}
        onLogoutPress={() => setShowLogoutConfirm(true)}
      />

      {/* Subscription Banner */}
      <SubscriptionBanner />

      {/* Floating Success Toast */}
      {toastMessage && (
        <View style={styles.toastContainer} pointerEvents="none">
          <View style={styles.toastBubble}>
            <Ionicons name="checkmark-circle" size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.toastText} numberOfLines={1}>
              {toastMessage}
            </Text>
          </View>
        </View>
      )}

      {/* Verifying QR Loading Overlay */}
      {isVerifyingQR && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.emerald700} />
          <Text style={styles.loadingText}>Verifying QR code status...</Text>
        </View>
      )}

      {/* Active Tab Screen */}
      <View style={styles.tabContent}>
        {activeTab === 'home' && renderHomeContent()}
        {activeTab === 'sync' && <FieldWorkerSyncQueueScreen />}
        {activeTab === 'profile' && <FieldWorkerProfileScreen />}
      </View>

      {/* Dynamic Bottom Navigation */}
      <FieldWorkerBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onFABPress={handleOpenScanner}
        pendingSyncCount={pendingCount}
      />

      {/* QR Scanner Modal */}
      <QRScannerModal
        visible={showScanner}
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
        scanMode="household"
      />

      {/* Household Mapping Digitization Form Modal */}
      <HouseholdMappingModal
        visible={showMappingModal}
        qrUid={targetQrUid}
        villageData={villageData}
        villageRoads={villageRoads}
        householdTypes={householdTypes}
        isOnline={isConnected}
        onClose={() => setShowMappingModal(false)}
        onSuccess={handleMappingSuccess}
      />

      {/* Already Mapped QR Read-Only Modal */}
      <MappedQRModal
        visible={showMappedQRModal}
        qrData={selectedMappedQR}
        onClose={() => {
          setShowMappedQRModal(false);
          setSelectedMappedQR(null);
        }}
      />

      {/* Subscription Blocked Modal */}
      <ServiceUnavailableModal
        visible={showUnavailableModal}
        onDismiss={() => setShowUnavailableModal(false)}
        message="Household mapping is temporarily paused because your village's GreenPath subscription has expired. Please contact your Panchayat administrator."
      />

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        visible={showLogoutConfirm}
        title="Confirm Logout"
        message="Are you sure you want to log out? Any unsynced mappings stored in your offline queue will remain safe on this device."
        confirmText="Log Out"
        destructive
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </View>
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
  homeScroll: {
    flex: 1,
  },
  homeScrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 40,
  },
  heroSection: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  heroSubtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
    marginTop: 3,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm + 2,
    ...Shadows.sm,
  },
  successIconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTextContainer: {
    flex: 1,
  },
  successTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: '#065f46',
  },
  successSubtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: '#059669',
    marginTop: 1,
  },
  cardSearch: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.slate100,
    borderLeftWidth: 4,
    borderLeftColor: '#60a5fa', // Blue-400
    padding: Spacing.md + 2,
    ...Shadows.sm,
  },
  cardSearchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe', // Blue-100
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSearchTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  uidInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    marginBottom: Spacing.md,
  },
  uidInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate900,
    letterSpacing: 0.5,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  mapButton: {
    backgroundColor: Colors.emerald600,
    borderRadius: BorderRadius.lg,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  mapButtonDisabled: {
    opacity: 0.45,
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mapButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
  },
  cardHowItWorks: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.slate100,
    borderLeftWidth: 4,
    borderLeftColor: '#34d399', // Green-400
    padding: Spacing.md + 2,
    marginTop: Spacing.md,
    ...Shadows.sm,
  },
  howItWorksTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate600,
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },
  stepsList: {
    gap: Spacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.emerald600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
  },
  stepIcon: {
    marginHorizontal: 2,
  },
  stepText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate700,
    flex: 1,
  },
  queueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffbeb', // Amber-50
    borderWidth: 1,
    borderColor: '#fed7aa', // Amber-200
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  queueBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    flex: 1,
  },
  queueBadgeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueBannerTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  queueBannerSubtitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate600,
    marginTop: 1,
  },
  toastContainer: {
    position: 'absolute',
    top: 68,
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9998,
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.emerald700,
  },
});
