/**
 * Bottom Navigation for Field Worker Dashboard
 *
 * Web Application Styled Raised Pill Navigation:
 * - Left: Sync Tab with live offline queue badge
 * - Center: Elevated Pill Button matching Web Application Dashboard
 *     - Pill with icon + "Scan QR" label (or "Home" on other tabs)
 *     - Emerald gradient glow and raised elevation
 *     - Small uppercase subtitle in bar ("TAP TO SCAN" / "RETURN HOME")
 * - Right: Profile Tab
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing } from '../../constants/theme';
import type { FieldWorkerTab } from '../../types/fieldworker';

interface FieldWorkerBottomNavProps {
  activeTab: FieldWorkerTab;
  onTabChange: (tab: FieldWorkerTab) => void;
  onFABPress: () => void;
  pendingSyncCount?: number;
}

const { width } = Dimensions.get('window');
const FAB_WIDTH = 144;
const FAB_HEIGHT = 60;

export function FieldWorkerBottomNav({
  activeTab,
  onTabChange,
  onFABPress,
  pendingSyncCount = 0,
}: FieldWorkerBottomNavProps) {
  const isHome = activeTab === 'home';
  const showSyncBadge = pendingSyncCount > 0;

  const handleTabPress = (tab: FieldWorkerTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTabChange(tab);
  };

  const handleFABPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isHome) {
      onFABPress(); // Open scanner
    } else {
      onTabChange('home'); // Return to Home
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {/* Left Tab: Sync Queue */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabPress('sync')}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrapper}>
            <Ionicons
              name={activeTab === 'sync' ? 'cloud-upload' : 'cloud-upload-outline'}
              size={28}
              color={
                activeTab === 'sync'
                  ? Colors.emerald600
                  : showSyncBadge
                    ? Colors.amber600
                    : Colors.slate400
              }
            />
            {showSyncBadge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {pendingSyncCount > 99 ? '99+' : pendingSyncCount}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'sync' && styles.tabLabelActive,
              activeTab !== 'sync' && showSyncBadge && styles.tabLabelBadge,
            ]}
          >
            Sync
          </Text>
        </TouchableOpacity>

        {/* Center Spacer with Web App Subtitle (Pressable) */}
        <TouchableOpacity
          style={styles.centerSpacer}
          onPress={handleFABPress}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.subtext,
              !isHome && styles.subtextHome,
            ]}
            numberOfLines={1}
          >
            {isHome ? 'TAP TO SCAN' : 'RETURN HOME'}
          </Text>
        </TouchableOpacity>

        {/* Right Tab: Profile */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabPress('profile')}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrapper}>
            <Ionicons
              name={activeTab === 'profile' ? 'person' : 'person-outline'}
              size={28}
              color={activeTab === 'profile' ? Colors.emerald600 : Colors.slate400}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'profile' && styles.tabLabelActive,
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* Web Application Elevated Pill Button */}
      <TouchableOpacity
        style={[
          styles.fabPill,
          isHome ? styles.fabPillScan : styles.fabPillHome,
        ]}
        onPress={handleFABPress}
        activeOpacity={0.85}
        accessibilityLabel={isHome ? 'Scan QR Code' : 'Navigate Home'}
      >
        <Ionicons
          name={isHome ? 'scan-outline' : 'home'}
          size={24}
          color={Colors.white}
        />
        <Text style={styles.fabPillText}>
          {isHome ? 'Scan QR' : 'Home'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: Colors.transparent,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.slate200,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 22 : 8,
    ...Platform.select({
      ios: {
        shadowColor: Colors.slate900,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tab: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrapper: {
    position: 'relative',
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
    marginTop: 3,
  },
  tabLabelActive: {
    color: Colors.emerald600,
    fontFamily: Typography.fontFamilySemiBold,
  },
  tabLabelBadge: {
    color: Colors.amber600,
    fontFamily: Typography.fontFamilySemiBold,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.destructive,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
    lineHeight: 11,
  },
  centerSpacer: {
    width: FAB_WIDTH + 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  subtext: {
    fontSize: 8.5,
    fontFamily: Typography.fontFamilyBold,
    color: '#3b1257ff',
    letterSpacing: 1.2,
    marginTop: 34, // Sits cleanly below the bottom rim of the elevated pill
    textAlign: 'center',
  },
  subtextHome: {
    color: Colors.slate400,
  },
  fabPill: {
    position: 'absolute',
    top: -22,
    left: (width - FAB_WIDTH) / 2,
    width: FAB_WIDTH,
    height: FAB_HEIGHT,
    borderRadius: FAB_HEIGHT / 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 3.5,
    borderColor: Colors.white,
    zIndex: 10,
  },
  fabPillHome: {
    backgroundColor: Colors.emerald600,
    ...Platform.select({
      ios: {
        shadowColor: Colors.emerald700,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  fabPillScan: {
    backgroundColor: '#862ea7ff', // Vibrant Purple-Pink
    ...Platform.select({
      ios: {
        shadowColor: '#862ea7ff',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  fabPillText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
    letterSpacing: 0.4,
  },
});
