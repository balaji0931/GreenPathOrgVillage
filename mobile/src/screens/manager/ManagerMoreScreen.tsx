/**
 * GreenPath Village Manager — "More" Tools Screen
 *
 * Dedicated operational hub containing purely management navigations:
 * 1. Households & QR Management
 * 2. Field Staff & Personnel
 * 3. Material Processing Logs
 * 4. Village GIS & Mapping (Gated by locationServicesEnabled)
 * 5. Village Management & Fleet
 * 6. Payments & Billing (Gated by paymentsEnabled)
 * 7. Attendance & Shifts (Gated by attendanceEnabled)
 */
import React from 'react';
import {
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Colors, Spacing } from '../../constants/theme';
import { MoreGroupCard } from '../../components/manager/MoreGroupCard';
import { MoreMenuItem } from '../../components/manager/MoreMenuItem';
import type {
  ManagerMoreScreenId,
  ManagerVillageData,
  MoreMenuItemDescriptor,
} from '../../types/manager';

interface ManagerMoreScreenProps {
  villageData: ManagerVillageData | null;
  onSelectScreen: (screenId: ManagerMoreScreenId) => void;
}

export function ManagerMoreScreen({
  villageData,
  onSelectScreen,
}: ManagerMoreScreenProps) {
  // ── 1. Households & QR Group ─────────────────────────────────
  const householdItems: MoreMenuItemDescriptor[] = [
    {
      id: 'household-details',
      label: 'Household Details',
      description: 'Search and browse registered village households',
      iconName: 'home-outline',
      iconColor: Colors.emerald700,
      iconBgColor: Colors.emerald50,
    },
    {
      id: 'add-household',
      label: 'Add Household',
      description: 'Map a new household to a QR code manually',
      iconName: 'add-circle-outline',
      iconColor: Colors.emerald700,
      iconBgColor: Colors.emerald50,
    },
    {
      id: 'generate-qr',
      label: 'Generate QR Codes',
      description: 'Batch generate pre-printed village QR codes',
      iconName: 'qr-code-outline',
      iconColor: Colors.emerald700,
      iconBgColor: Colors.emerald50,
    },
    {
      id: 'download-qr',
      label: 'Download QR Codes',
      description: 'Export printable PDF vinyl sticker sheets',
      iconName: 'download-outline',
      iconColor: Colors.emerald700,
      iconBgColor: Colors.emerald50,
    },
    {
      id: 'household-performance',
      label: 'Household Performance',
      description: 'Segregation compliance star ratings & tracking',
      iconName: 'trending-up-outline',
      iconColor: Colors.emerald700,
      iconBgColor: Colors.emerald50,
    },
  ];

  // ── 2. Field Staff Group ─────────────────────────────────────
  const staffItems: MoreMenuItemDescriptor[] = [
    {
      id: 'collectors',
      label: 'Waste Collectors',
      description: 'Collector staff directory & ward assignments',
      iconName: 'people-outline',
      iconColor: Colors.blue600,
      iconBgColor: Colors.blue50,
    },
    {
      id: 'fieldworkers',
      label: 'Field Workers',
      description: 'Household mapping personnel & QR productivity',
      iconName: 'navigate-outline',
      iconColor: Colors.blue600,
      iconBgColor: Colors.blue50,
    },
    {
      id: 'helpers',
      label: 'Sanitation Helpers',
      description: 'Vehicle helpers & street collection assistants',
      iconName: 'construct-outline',
      iconColor: Colors.blue600,
      iconBgColor: Colors.blue50,
    },
    {
      id: 'segregators',
      label: 'Waste Segregators',
      description: 'Processing plant material sorting staff',
      iconName: 'sync-outline',
      iconColor: Colors.blue600,
      iconBgColor: Colors.blue50,
    },
    {
      id: 'announcements',
      label: 'Broadcast Notices',
      description: 'Send voice notes & urgent alerts to workers',
      iconName: 'megaphone-outline',
      iconColor: Colors.blue600,
      iconBgColor: Colors.blue50,
    },
  ];

  // ── 3. Material Logs Group ───────────────────────────────────
  const materialItems: MoreMenuItemDescriptor[] = [
    {
      id: 'daily-waste-logs',
      label: 'Daily Waste Logs',
      description: 'Dry waste processing & segregation weights',
      iconName: 'clipboard-outline',
      iconColor: Colors.amber600,
      iconBgColor: Colors.warningLight,
    },
    {
      id: 'compost-logs',
      label: 'Compost Logs',
      description: 'Organic waste aerobic compost pit tracking',
      iconName: 'leaf-outline',
      iconColor: Colors.amber600,
      iconBgColor: Colors.warningLight,
    },
    {
      id: 'sales-logs',
      label: 'Sales Logs',
      description: 'Recyclables & compost revenue sales records',
      iconName: 'cash-outline',
      iconColor: Colors.amber600,
      iconBgColor: Colors.warningLight,
    },
  ];

  // ── 4. Village GIS & Mapping Group (Conditional) ─────────────
  const mapItems: MoreMenuItemDescriptor[] = [
    {
      id: 'road-mapper',
      label: 'Road Mapper',
      description: 'GPS path recorder & village lane mapper',
      iconName: 'map-outline',
      iconColor: '#0891b2',
      iconBgColor: '#ecfeff',
    },
    {
      id: 'boundaries',
      label: 'Boundaries Editor',
      description: 'Village & ward polygon geofencing tools',
      iconName: 'locate-outline',
      iconColor: '#0891b2',
      iconBgColor: '#ecfeff',
    },
  ];

  // ── 5. Village Management Group ──────────────────────────────
  const managementItems: MoreMenuItemDescriptor[] = [
    {
      id: 'vehicles',
      label: 'Vehicle Fleet',
      description: 'Garbage autos, tractors & registration details',
      iconName: 'car-outline',
      iconColor: Colors.purple600,
      iconBgColor: Colors.purple50,
    },
    {
      id: 'wards',
      label: 'Wards Setup',
      description: 'Configure village wards & boundaries',
      iconName: 'pin-outline',
      iconColor: Colors.purple600,
      iconBgColor: Colors.purple50,
    },
    {
      id: 'village-settings',
      label: 'Village Settings',
      description: 'System rules, weights, photos & feature flags',
      iconName: 'settings-outline',
      iconColor: Colors.purple600,
      iconBgColor: Colors.purple50,
    },
    {
      id: 'activity-log',
      label: 'Activity Log',
      description: 'System security audit trail & operations log',
      iconName: 'list-outline',
      iconColor: Colors.purple600,
      iconBgColor: Colors.purple50,
    },
    {
      id: 'data-export',
      label: 'Data Export',
      description: 'Export collection & household data as Excel/CSV',
      iconName: 'document-text-outline',
      iconColor: Colors.purple600,
      iconBgColor: Colors.purple50,
    },
  ];

  // ── 6. Payments & Billing Group (Conditional) ────────────────
  const paymentItems: MoreMenuItemDescriptor[] = [
    {
      id: 'payments-ledger',
      label: 'Payments Ledger',
      description: 'Sanitation user fee collection ledger & dues',
      iconName: 'card-outline',
      iconColor: '#0f766e',
      iconBgColor: '#f0fdfa',
    },
    {
      id: 'payments-settings',
      label: 'Payment Settings',
      description: 'Configure fee rates per household type',
      iconName: 'options-outline',
      iconColor: '#0f766e',
      iconBgColor: '#f0fdfa',
    },
  ];

  // ── 7. Attendance & Shifts Group (Conditional) ───────────────
  const attendanceItems: MoreMenuItemDescriptor[] = [
    {
      id: 'att-centers',
      label: 'Attendance Centers',
      description: 'Geofenced muster points & auto clock-in zones',
      iconName: 'business-outline',
      iconColor: '#4f46e5',
      iconBgColor: '#eef2ff',
    },
    {
      id: 'att-mark',
      label: 'Mark Attendance',
      description: 'Supervisor manual clock-in & daily register',
      iconName: 'time-outline',
      iconColor: '#4f46e5',
      iconBgColor: '#eef2ff',
    },
    {
      id: 'att-shifts',
      label: 'Shift Rosters',
      description: 'Staff shift assignments & timetables',
      iconName: 'calendar-outline',
      iconColor: '#4f46e5',
      iconBgColor: '#eef2ff',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Households Group */}
      <MoreGroupCard title="Households & QR Codes">
        {householdItems.map((item, idx) => (
          <MoreMenuItem
            key={item.id}
            item={item}
            onPress={onSelectScreen}
            isLast={idx === householdItems.length - 1}
          />
        ))}
      </MoreGroupCard>

      {/* 2. Field Staff Group */}
      <MoreGroupCard title="Field Staff & Personnel">
        {staffItems.map((item, idx) => (
          <MoreMenuItem
            key={item.id}
            item={item}
            onPress={onSelectScreen}
            isLast={idx === staffItems.length - 1}
          />
        ))}
      </MoreGroupCard>

      {/* 3. Material Processing Logs Group */}
      <MoreGroupCard title="Material Processing Logs">
        {materialItems.map((item, idx) => (
          <MoreMenuItem
            key={item.id}
            item={item}
            onPress={onSelectScreen}
            isLast={idx === materialItems.length - 1}
          />
        ))}
      </MoreGroupCard>

      {/* 4. Village GIS & Mapping Group (Conditional) */}
      {villageData?.locationServicesEnabled && (
        <MoreGroupCard title="Village GIS & Mapping" badge="GPS Enabled">
          {mapItems.map((item, idx) => (
            <MoreMenuItem
              key={item.id}
              item={item}
              onPress={onSelectScreen}
              isLast={idx === mapItems.length - 1}
            />
          ))}
        </MoreGroupCard>
      )}

      {/* 5. Village Management Group */}
      <MoreGroupCard title="Village Management & Fleet">
        {managementItems.map((item, idx) => (
          <MoreMenuItem
            key={item.id}
            item={item}
            onPress={onSelectScreen}
            isLast={idx === managementItems.length - 1}
          />
        ))}
      </MoreGroupCard>

      {/* 6. Payments & Billing Group (Conditional) */}
      {villageData?.paymentsEnabled && (
        <MoreGroupCard title="Payments & Billing" badge="Enabled">
          {paymentItems.map((item, idx) => (
            <MoreMenuItem
              key={item.id}
              item={item}
              onPress={onSelectScreen}
              isLast={idx === paymentItems.length - 1}
            />
          ))}
        </MoreGroupCard>
      )}

      {/* 7. Attendance & Shifts Group (Conditional) */}
      {villageData?.attendanceEnabled && (
        <MoreGroupCard title="Attendance & Shifts" badge="Geofenced">
          {attendanceItems.map((item, idx) => (
            <MoreMenuItem
              key={item.id}
              item={item}
              onPress={onSelectScreen}
              isLast={idx === attendanceItems.length - 1}
            />
          ))}
        </MoreGroupCard>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
  },
});
