/**
 * GreenPath Village Manager — 5-Tab Bottom Navigation Bar
 *
 * Requirements:
 * - 5 Tabs: Reports, Collections, Map (conditional), Issues (with badge), More
 * - Gated Map tab: Only visible when locationServicesEnabled === true
 * - Top active accent bar indicator
 * - Touch haptics & safe area padding
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import type { ManagerTab } from '../../types/manager';

interface ManagerBottomNavProps {
  activeTab: ManagerTab;
  onSelectTab: (tab: ManagerTab) => void;
  locationServicesEnabled?: boolean;
  issuesCount?: number;
}

interface TabItemConfig {
  id: ManagerTab;
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
  badgeCount?: number;
}

export function ManagerBottomNav({
  activeTab,
  onSelectTab,
  locationServicesEnabled = false,
  issuesCount = 0,
}: ManagerBottomNavProps) {
  const insets = useSafeAreaInsets();

  const tabs: TabItemConfig[] = [
    {
      id: 'reports',
      label: 'Reports',
      iconActive: 'bar-chart',
      iconInactive: 'bar-chart-outline',
    },
    {
      id: 'collections',
      label: 'Collections',
      iconActive: 'trash',
      iconInactive: 'trash-outline',
    },
    ...(locationServicesEnabled
      ? [
        {
          id: 'map-viz' as ManagerTab,
          label: 'Map',
          iconActive: 'map' as const,
          iconInactive: 'map-outline' as const,
        },
      ]
      : []),
    {
      id: 'issues',
      label: 'Issues',
      iconActive: 'alert-circle',
      iconInactive: 'alert-circle-outline',
      badgeCount: issuesCount,
    },
    {
      id: 'more',
      label: 'More',
      iconActive: 'grid',
      iconInactive: 'grid-outline',
    },
  ];

  const handleTabPress = (tabId: ManagerTab) => {
    if (activeTab !== tabId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectTab(tabId);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabButton}
              onPress={() => handleTabPress(tab.id)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab.label} tab`}
            >
              {/* Top Accent Active Pill */}
              {isActive && <View style={styles.activeIndicator} />}

              {/* Icon Container with Badge */}
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={isActive ? tab.iconActive : tab.iconInactive}
                  size={28}
                  color={isActive ? Colors.emerald700 : Colors.slate400}
                />
                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {tab.badgeCount > 99 ? '99+' : tab.badgeCount}
                    </Text>
                  </View>
                )}
              </View>

              {/* Label */}
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
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
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.slate200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    height: 54,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
    paddingTop: 4,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 3,
    backgroundColor: Colors.emerald700,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 26,
    minHeight: 26,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  tabLabelActive: {
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
  },
  tabLabelInactive: {
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 9,
    fontFamily: Typography.fontFamilyBold,
    lineHeight: 11,
  },
});
