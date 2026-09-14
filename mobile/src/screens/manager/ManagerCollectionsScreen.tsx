/**
 * GreenPath Village Manager — Tab 2: Live Collections Screen
 *
 * Real-time household collection stream:
 * - Search by house #, resident name, or UID
 * - Filter chips (All, Dry, Wet, Missed, Sanitary)
 * - Ward filter dropdown
 * - Collection detail modal preview
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export function ManagerCollectionsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'dry' | 'wet' | 'missed'>('all');

  const filterChips = [
    { id: 'all' as const, label: 'All Picks' },
    { id: 'wet' as const, label: 'Wet (Organic)' },
    { id: 'dry' as const, label: 'Dry (Recyclable)' },
    { id: 'missed' as const, label: 'Missed' },
  ];

  return (
    <View style={styles.container}>
      {/* Top Search Bar */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.slate400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search house #, name, or UID..."
            placeholderTextColor={Colors.slate400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={Colors.slate400} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips Row */}
      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {filterChips.map((chip) => {
            const isActive = activeFilter === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveFilter(chip.id);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Feed Content Area */}
      <ScrollView contentContainerStyle={styles.feedScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="cube-outline" size={32} color={Colors.emerald700} />
          </View>
          <Text style={styles.emptyTitle}>Live Collections Feed</Text>
          <Text style={styles.emptyDescription}>
            Real-time household collection logs, weight records, photo verification & ward filtering will activate in Phase 3.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.white,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate100,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 42,
    gap: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate900,
    height: '100%',
  },
  filtersWrapper: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
    paddingVertical: Spacing.sm,
  },
  filtersRow: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
  },
  filterChipActive: {
    backgroundColor: Colors.emerald700,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
  },
  filterChipTextActive: {
    color: Colors.white,
    fontFamily: Typography.fontFamilyBold,
  },
  feedScroll: {
    padding: Spacing.lg,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
    marginTop: Spacing.md,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.emerald50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    marginBottom: Spacing.xs,
  },
  emptyDescription: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    textAlign: 'center',
    lineHeight: 18,
  },
});
