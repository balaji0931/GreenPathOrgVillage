/**
 * Bottom Navigation for Collector Dashboard
 *
 * Matches web collector dashboard bottom nav:
 * - Center elevated FAB for QR scan / Home (blue with white border, matching web)
 * - Large, bold icons ONLY (no text labels)
 * - Dedicated Sync/Offline queue tab replacing profile (profile is in top bar)
 * - Dynamic cloud icon with badge counter for pending offline syncs
 */
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../constants/theme';

export type CollectorTab = 'home' | 'shift' | 'reports' | 'announcements' | 'wastelog' | 'sync' | 'profile';

interface BottomNavProps {
  activeTab: CollectorTab;
  onTabChange: (tab: CollectorTab) => void;
  onFABPress: () => void;
  attendanceEnabled: boolean;
  wasteLogEnabled: boolean;
  pendingSyncCount?: number;
}

interface TabItem {
  key: CollectorTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  badgeCount?: number;
}

export function BottomNav({
  activeTab,
  onTabChange,
  onFABPress,
  attendanceEnabled,
  wasteLogEnabled,
  pendingSyncCount = 0,
}: BottomNavProps) {
  // Build left and right tabs
  const leftTabs: TabItem[] = [];
  const rightTabs: TabItem[] = [];

  if (attendanceEnabled) {
    leftTabs.push({
      key: 'shift',
      label: 'Shifts',
      icon: 'time',
      activeIcon: 'time',
    });
  }
  leftTabs.push({
    key: 'reports',
    label: 'Reports',
    icon: 'bar-chart-outline',
    activeIcon: 'bar-chart',
  });

  if (wasteLogEnabled) {
    rightTabs.push({
      key: 'wastelog',
      label: 'Logs',
      icon: 'trash',
      activeIcon: 'trash',
    });
  }

  // Dynamic Sync Tab (replacing profile in bottom nav)
  rightTabs.push({
    key: 'sync',
    label: 'Sync',
    icon: pendingSyncCount > 0 ? 'cloud-upload' : 'cloud-done',
    activeIcon: pendingSyncCount > 0 ? 'cloud-upload' : 'cloud-done',
    badgeCount: pendingSyncCount,
  });

  const isHome = activeTab === 'home';
  const centerLabel = isHome ? 'Scan' : 'Home';
  const centerIcon = isHome ? 'scan' : 'home';

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        {/* Left Tabs Group (moved away from center) */}
        <View style={styles.tabGroup}>
          {leftTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tab}
                onPress={() => onTabChange(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={28}
                  color={isActive ? Colors.emerald600 : Colors.slate400}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    isActive && styles.tabLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Center Spacer with Dynamic Label (Scan / Home) */}
        <View style={styles.fabSpacer}>
          <Text
            style={[
              styles.centerLabel,
              isHome ? styles.centerLabelScan : styles.centerLabelHome,
            ]}
            numberOfLines={1}
          >
            {centerLabel}
          </Text>
        </View>

        {/* Right Tabs Group (moved away from center) */}
        <View style={styles.tabGroup}>
          {rightTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const showBadge = (tab.badgeCount ?? 0) > 0;

            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tab}
                onPress={() => onTabChange(tab.key)}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrapper}>
                  <Ionicons
                    name={isActive ? tab.activeIcon : tab.icon}
                    size={28}
                    color={
                      isActive
                        ? Colors.emerald600
                        : showBadge
                          ? Colors.amber600
                          : Colors.slate400
                    }
                  />
                  {showBadge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {tab.badgeCount! > 99 ? '99+' : tab.badgeCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    isActive && styles.tabLabelActive,
                    !isActive && showBadge && styles.tabLabelBadge,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Center Scan / Home FAB (Web Application Raised Style) */}
      <TouchableOpacity
        style={[
          styles.fab,
          isHome ? styles.fabScan : styles.fabHome,
        ]}
        onPress={isHome ? onFABPress : () => onTabChange('home')}
        activeOpacity={0.85}
      >
        <Ionicons
          name={centerIcon}
          size={30}
          color={Colors.white}
        />
      </TouchableOpacity>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.slate200,
    paddingBottom: Platform.OS === 'ios' ? 22 : 8,
    paddingTop: 8,
    paddingHorizontal: Spacing.sm,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 10,
  },
  tabGroup: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
    gap: 2,
  },
  tabLabel: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: Colors.greenPrimary,
    fontFamily: Typography.fontFamilyBold,
  },
  tabLabelBadge: {
    color: Colors.amber600,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: Colors.amber600,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
  fabSpacer: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  centerLabel: {
    fontSize: 10.5,
    fontFamily: Typography.fontFamilyBold,
    letterSpacing: 0.2,
    marginTop: 30,
  },
  centerLabelScan: {
    color: Colors.blue600,
  },
  centerLabelHome: {
    color: Colors.emerald600,
  },
  fab: {
    position: 'absolute',
    top: -24,
    left: (width - 64) / 2,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
    zIndex: 2,
  },
  fabScan: {
    backgroundColor: Colors.blue600,
    shadowColor: Colors.blue600,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  fabHome: {
    backgroundColor: Colors.emerald600,
    shadowColor: Colors.emerald600,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
});
