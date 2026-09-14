/**
 * GreenPath Village Manager — Master Dashboard & Navigation Orchestrator
 *
 * Responsibilities:
 * - 5 Bottom Tabs: reports, collections, map-viz (conditional), issues, more
 * - Sub-screen routing from "More" with Android BackHandler support
 * - Top Global Header: [G] logo, Village Name, active tab/screen subtitle, announcements bell, avatar
 * - Offline / Network banner & Subscription Banner
 * - Dynamic villageData loading & feature flag gating
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  BackHandler,
  ToastAndroid,
  Platform,
} from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { useNetwork } from '../../hooks/useNetwork';
import { NetworkBanner } from '../../components/common/NetworkBanner';
import { SubscriptionBanner } from '../../components/common/SubscriptionBanner';
import { ManagerHeader } from '../../components/manager/ManagerHeader';
import { ManagerBottomNav } from '../../components/manager/ManagerBottomNav';
import { SubScreenContainer } from '../../components/manager/SubScreenContainer';
import { ManagerReportsScreen } from './ManagerReportsScreen';
import { ManagerCollectionsScreen } from './ManagerCollectionsScreen';
import { ManagerMapScreen } from './ManagerMapScreen';
import { ManagerIssuesScreen } from './ManagerIssuesScreen';
import { ManagerMoreScreen } from './ManagerMoreScreen';
import { ManagerProfileScreen } from './ManagerProfileScreen';
import {
  fetchManagerVillageData,
  fetchManagerAnnouncements,
  fetchManagerOpenIssuesCount,
} from '../../api/manager.api';
import { Colors } from '../../constants/theme';
import type {
  ManagerTab,
  ManagerMoreScreenId,
  ManagerVillageData,
} from '../../types/manager';

// Metadata mapping for the 22 tools under the More tab
const SUB_SCREEN_META: Record<
  ManagerMoreScreenId,
  {
    title: string;
    category: string;
    description: string;
    iconName: any;
    iconColor: string;
    iconBgColor: string;
  }
> = {
  'household-details': {
    title: 'Household Details',
    category: 'Households & QR',
    description: 'Search, filter, and inspect registered households with QR pairing and resident contacts.',
    iconName: 'home-outline',
    iconColor: Colors.emerald700,
    iconBgColor: Colors.emerald50,
  },
  'add-household': {
    title: 'Add Household',
    category: 'Households & QR',
    description: 'In-office registration wizard: capture GPS pin, address, ward, and pair a pre-printed QR code.',
    iconName: 'add-circle-outline',
    iconColor: Colors.emerald700,
    iconBgColor: Colors.emerald50,
  },
  'generate-qr': {
    title: 'Generate QR Codes',
    category: 'Households & QR',
    description: 'Batch generate 50, 100, or 500 unique village QR codes for distribution.',
    iconName: 'qr-code-outline',
    iconColor: Colors.emerald700,
    iconBgColor: Colors.emerald50,
  },
  'download-qr': {
    title: 'Download QR Codes',
    category: 'Households & QR',
    description: 'Preview and export printable PDF sticker sheets ready for field deployment.',
    iconName: 'download-outline',
    iconColor: Colors.emerald700,
    iconBgColor: Colors.emerald50,
  },
  'household-performance': {
    title: 'Household Performance',
    category: 'Analytics & Compliance',
    description: 'Track waste segregation compliance star ratings and flag non-segregating households.',
    iconName: 'trending-up-outline',
    iconColor: Colors.emerald700,
    iconBgColor: Colors.emerald50,
  },
  collectors: {
    title: 'Waste Collectors',
    category: 'Field Staff',
    description: 'Manage waste collector staff accounts, phone contacts, and assigned village wards.',
    iconName: 'people-outline',
    iconColor: Colors.blue600,
    iconBgColor: Colors.blue50,
  },
  fieldworkers: {
    title: 'Field Workers',
    category: 'Field Staff',
    description: 'Track household mapping personnel, daily mapping counts, and QR assignment productivity.',
    iconName: 'navigate-outline',
    iconColor: Colors.blue600,
    iconBgColor: Colors.blue50,
  },
  helpers: {
    title: 'Sanitation Helpers',
    category: 'Field Staff',
    description: 'Manage vehicle helpers and roadside waste collection assistants.',
    iconName: 'construct-outline',
    iconColor: Colors.blue600,
    iconBgColor: Colors.blue50,
  },
  segregators: {
    title: 'Waste Segregators',
    category: 'Field Staff',
    description: 'Manage solid waste sorting personnel at the material recovery facility.',
    iconName: 'sync-outline',
    iconColor: Colors.blue600,
    iconBgColor: Colors.blue50,
  },
  announcements: {
    title: 'Broadcast Notices',
    category: 'Field Staff',
    description: 'Broadcast voice notes and urgent announcements directly to collectors and citizens.',
    iconName: 'megaphone-outline',
    iconColor: Colors.blue600,
    iconBgColor: Colors.blue50,
  },
  'daily-waste-logs': {
    title: 'Daily Waste Logs',
    category: 'Material Recovery',
    description: 'Record dry waste processing weights across paper, plastic, metal, and glass streams.',
    iconName: 'clipboard-outline',
    iconColor: Colors.amber600,
    iconBgColor: Colors.warningLight,
  },
  'compost-logs': {
    title: 'Compost Logs',
    category: 'Material Recovery',
    description: 'Monitor organic waste aerobic composting pits, turning cycles, and harvest yields.',
    iconName: 'leaf-outline',
    iconColor: Colors.amber600,
    iconBgColor: Colors.warningLight,
  },
  'sales-logs': {
    title: 'Sales & Revenue',
    category: 'Material Recovery',
    description: 'Log sales of recyclables and organic compost batches to vendors with revenue totals.',
    iconName: 'cash-outline',
    iconColor: Colors.amber600,
    iconBgColor: Colors.warningLight,
  },
  'road-mapper': {
    title: 'Road Mapper',
    category: 'Village GIS',
    description: 'GPS path recorder and interactive village lane and access road drawing canvas.',
    iconName: 'map-outline',
    iconColor: '#0891b2',
    iconBgColor: '#ecfeff',
  },
  boundaries: {
    title: 'Boundaries Editor',
    category: 'Village GIS',
    description: 'Interactive boundary polygon editor for village master border and internal ward geofences.',
    iconName: 'locate-outline',
    iconColor: '#0891b2',
    iconBgColor: '#ecfeff',
  },
  vehicles: {
    title: 'Vehicle Fleet',
    category: 'Fleet Logistics',
    description: 'Fleet registry of garbage auto-tippers, compactor trucks, and driver allocations.',
    iconName: 'car-outline',
    iconColor: Colors.purple600,
    iconBgColor: Colors.purple50,
  },
  wards: {
    title: 'Wards Setup',
    category: 'Governance',
    description: 'Configure village wards, ward numbering, and area boundary assignments.',
    iconName: 'pin-outline',
    iconColor: Colors.purple600,
    iconBgColor: Colors.purple50,
  },
  'village-settings': {
    title: 'Village Settings',
    category: 'Governance',
    description: 'Configure village operational rules: mandatory photos, weight scales, and attendance.',
    iconName: 'settings-outline',
    iconColor: Colors.purple600,
    iconBgColor: Colors.purple50,
  },
  'activity-log': {
    title: 'Activity Log',
    category: 'Governance',
    description: 'System security audit trail tracking every scan, login, and modification.',
    iconName: 'list-outline',
    iconColor: Colors.purple600,
    iconBgColor: Colors.purple50,
  },
  'data-export': {
    title: 'Data Export',
    category: 'Governance',
    description: 'Export collection histories, household registries, and attendance to Excel or CSV.',
    iconName: 'document-text-outline',
    iconColor: Colors.purple600,
    iconBgColor: Colors.purple50,
  },
  'payments-ledger': {
    title: 'Payments Ledger',
    category: 'Finance & Billing',
    description: 'Sanitation user fee collection ledger, monthly payment receipts, and pending dues.',
    iconName: 'card-outline',
    iconColor: '#0f766e',
    iconBgColor: '#f0fdfa',
  },
  'payments-settings': {
    title: 'Payment Settings',
    category: 'Finance & Billing',
    description: 'Configure monthly sanitation fee tariffs for residential, commercial, and institutions.',
    iconName: 'options-outline',
    iconColor: '#0f766e',
    iconBgColor: '#f0fdfa',
  },
  'att-centers': {
    title: 'Attendance Centers',
    category: 'Attendance & Shifts',
    description: 'Setup geofenced muster points and checkposts with coordinates and detection radii.',
    iconName: 'business-outline',
    iconColor: '#4f46e5',
    iconBgColor: '#eef2ff',
  },
  'att-mark': {
    title: 'Mark Attendance',
    category: 'Attendance & Shifts',
    description: 'Supervisor attendance override register to manually verify or mark staff attendance.',
    iconName: 'time-outline',
    iconColor: '#4f46e5',
    iconBgColor: '#eef2ff',
  },
  'att-shifts': {
    title: 'Shift Rosters',
    category: 'Attendance & Shifts',
    description: 'Define and schedule morning collection shifts and processing plant sorting rosters.',
    iconName: 'calendar-outline',
    iconColor: '#4f46e5',
    iconBgColor: '#eef2ff',
  },
  'change-password': {
    title: 'Change Password',
    category: 'Account & Security',
    description: 'Update your GreenPath manager account security password.',
    iconName: 'key-outline',
    iconColor: Colors.slate700,
    iconBgColor: Colors.slate100,
  },
  language: {
    title: 'Language',
    category: 'Account & Preferences',
    description: 'Switch application language between English, Kannada, Hindi, and others.',
    iconName: 'globe-outline',
    iconColor: Colors.slate700,
    iconBgColor: Colors.slate100,
  },
};

export function ManagerDashboard() {
  const { user, logout } = useAuth();
  const { isConnected } = useNetwork();

  // Navigation State
  const [activeTab, setActiveTab] = useState<ManagerTab>('reports');
  const [activeMoreScreen, setActiveMoreScreen] = useState<ManagerMoreScreenId | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  // Data State
  const [villageData, setVillageData] = useState<ManagerVillageData | null>(null);
  const [announcementsCount, setAnnouncementsCount] = useState<number>(0);
  const [issuesCount, setIssuesCount] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Load Village Data & Metadata
  const loadDashboardData = useCallback(async () => {
    if (!user?.villageId) return;
    try {
      const [vData, announcements, openIssues] = await Promise.all([
        fetchManagerVillageData(user.villageId),
        fetchManagerAnnouncements(),
        fetchManagerOpenIssuesCount(),
      ]);

      if (vData) setVillageData(vData);
      setAnnouncementsCount(announcements.length);
      setIssuesCount(openIssues);
    } catch {
      // Fallback data if network unavailable
      if (!villageData) {
        setVillageData({
          id: user.villageId,
          name: 'GreenPath Village',
          locationServicesEnabled: true,
          weightRequired: false,
          imageUploadRequired: false,
          collectorWasteLogEnabled: false,
          attendanceEnabled: true,
          paymentsEnabled: false,
        });
      }
    }
  }, [user?.villageId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  // Android Hardware Back Button Handling
  useEffect(() => {
    let lastBackPress = 0;

    const onBackPress = () => {
      // Level 3: Inside Profile screen -> return to current tab
      if (isProfileOpen) {
        setIsProfileOpen(false);
        return true;
      }

      // Level 2: Inside a sub-screen from More -> return to More root
      if (activeMoreScreen !== null) {
        setActiveMoreScreen(null);
        return true;
      }

      // Level 1: In a non-reports tab -> return to Reports tab
      if (activeTab !== 'reports') {
        setActiveTab('reports');
        return true;
      }

      // Level 0: On Reports tab -> exit with double-tap
      const now = Date.now();
      if (now - lastBackPress < 2000) {
        BackHandler.exitApp();
        return true;
      }
      lastBackPress = now;
      if (Platform.OS === 'android') {
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      }
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isProfileOpen, activeMoreScreen, activeTab]);

  // Determine Dynamic Subtitle for Global Header
  const getHeaderSubtitle = (): string => {
    if (isProfileOpen) {
      return 'My Profile';
    }
    if (activeMoreScreen !== null) {
      return SUB_SCREEN_META[activeMoreScreen]?.title || 'Management Tool';
    }
    switch (activeTab) {
      case 'reports':
        return 'Daily Reports';
      case 'collections':
        return 'Live Collections';
      case 'map-viz':
        return 'Village Map View';
      case 'issues':
        return 'Citizen Grievances';
      case 'more':
        return 'Management Hub';
      default:
        return 'Dashboard';
    }
  };

  // Sub-Screen Back Navigation
  const handleSubScreenBack = () => {
    setActiveMoreScreen(null);
  };

  // Quick Action: Announcements from Header Bell
  const handleHeaderAnnouncements = () => {
    setIsProfileOpen(false);
    setActiveTab('more');
    setActiveMoreScreen('announcements');
  };

  // Quick Action: Profile from Header Avatar
  const handleHeaderProfile = () => {
    setIsProfileOpen(true);
  };

  // Tab Selection
  const handleSelectTab = (tab: ManagerTab) => {
    setIsProfileOpen(false);
    setActiveTab(tab);
    setActiveMoreScreen(null);
  };

  return (
    <View style={styles.rootContainer}>
      {/* Network Connectivity Banner */}
      <NetworkBanner />

      {/* Global Top Header Bar */}
      <ManagerHeader
        villageName={villageData?.name || 'GreenPath Village'}
        subtitle={getHeaderSubtitle()}
        announcementsCount={announcementsCount}
        userName={user?.name || 'Manager'}
        onPressAnnouncements={handleHeaderAnnouncements}
        onPressProfile={handleHeaderProfile}
      />

      {/* Subscription Status Banner */}
      <SubscriptionBanner />

      {/* Main View Area */}
      <View style={styles.contentContainer}>
        {/* Render Profile Screen when Profile is clicked */}
        {isProfileOpen ? (
          <ManagerProfileScreen
            villageData={villageData}
            userName={user?.name}
            userId={user?.userId}
            userRole={user?.role}
            onSelectScreen={(screenId) => {
              setIsProfileOpen(false);
              setActiveTab('more');
              setActiveMoreScreen(screenId);
            }}
            onBack={() => setIsProfileOpen(false)}
            onLogout={logout}
          />
        ) : activeTab === 'more' && activeMoreScreen !== null ? (
          <SubScreenContainer
            screenId={activeMoreScreen}
            title={SUB_SCREEN_META[activeMoreScreen]?.title || 'Tool'}
            category={SUB_SCREEN_META[activeMoreScreen]?.category}
            description={SUB_SCREEN_META[activeMoreScreen]?.description}
            iconName={SUB_SCREEN_META[activeMoreScreen]?.iconName}
            iconColor={SUB_SCREEN_META[activeMoreScreen]?.iconColor}
            iconBgColor={SUB_SCREEN_META[activeMoreScreen]?.iconBgColor}
            onBack={handleSubScreenBack}
          />
        ) : (
          <>
            {/* Tab 1: Daily Reports */}
            {activeTab === 'reports' && (
              <ManagerReportsScreen
                villageData={villageData}
                onNavigateToTab={handleSelectTab}
                isRefreshing={isRefreshing}
                onRefresh={handleRefresh}
              />
            )}

            {/* Tab 2: Live Collections */}
            {activeTab === 'collections' && <ManagerCollectionsScreen />}

            {/* Tab 3: Village GIS Map (Conditional) */}
            {activeTab === 'map-viz' && <ManagerMapScreen villageData={villageData} />}

            {/* Tab 4: Citizen Grievances */}
            {activeTab === 'issues' && <ManagerIssuesScreen />}

            {/* Tab 5: More Tools & Governance Matrix */}
            {activeTab === 'more' && (
              <ManagerMoreScreen
                villageData={villageData}
                onSelectScreen={setActiveMoreScreen}
              />
            )}
          </>
        )}
      </View>

      {/* 5-Tab Bottom Navigation Bar */}
      <ManagerBottomNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        locationServicesEnabled={Boolean(villageData?.locationServicesEnabled)}
        issuesCount={issuesCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    flex: 1,
  },
});
