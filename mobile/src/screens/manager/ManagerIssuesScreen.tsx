/**
 * GreenPath Village Manager — Tab 4: Citizen Grievances & Issues Screen
 *
 * Grievance ticket triage:
 * - Illegal dumping spots, missed pickups, bin overflows
 * - Urgency badges & status filtering (All, Open, In Progress, Resolved)
 * - Photo viewer & camera proof resolution flow
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export function ManagerIssuesScreen() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const filters = [
    { id: 'all' as const, label: 'All Grievances' },
    { id: 'open' as const, label: 'Open' },
    { id: 'resolved' as const, label: 'Resolved' },
  ];

  return (
    <View style={styles.container}>
      {/* Top Filter Bar */}
      <View style={styles.filtersBar}>
        <View style={styles.filterPillsRow}>
          {filters.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveFilter(f.id);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Main Issues Feed Scroll */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.emptyCard}>
          <View style={styles.iconBox}>
            <Ionicons name="alert-circle-outline" size={36} color={Colors.destructive} />
          </View>
          <Text style={styles.emptyTitle}>Citizen Grievance Feed</Text>
          <Text style={styles.emptyDescription}>
            Live complaint tickets, citizen photo evidence, and resolution camera flows will activate in Phase 5.
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
  filtersBar: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
  },
  filterPillActive: {
    backgroundColor: Colors.emerald700,
  },
  filterPillText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
  },
  filterPillTextActive: {
    color: Colors.white,
    fontFamily: Typography.fontFamilyBold,
  },
  scrollContent: {
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
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.destructiveLight,
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
