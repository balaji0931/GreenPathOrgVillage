/**
 * Field Worker Mapping Card Component
 *
 * Renders a mapped household item in the Field Worker Dashboard list:
 * - House Number badge
 * - Head of Household name & mobile
 * - Ward / Area pill
 * - Local / Synced status indicator
 * - Coordinates indicator
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { MappedHousehold } from '../../types/fieldworker';

interface FieldWorkerMappingCardProps {
  household: MappedHousehold;
  isPendingSync?: boolean;
  onPress?: () => void;
}

export function FieldWorkerMappingCard({
  household,
  isPendingSync = false,
  onPress,
}: FieldWorkerMappingCardProps) {
  const CardContainer = onPress ? TouchableOpacity : View;
  return (
    <CardContainer style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.left}>
        {/* House Number Icon Badge */}
        <View style={[styles.houseBadge, isPendingSync && styles.houseBadgePending]}>
          <Ionicons
            name="home"
            size={18}
            color={isPendingSync ? Colors.amber600 : Colors.emerald600}
          />
          <Text
            style={[styles.houseNumberText, isPendingSync && styles.houseNumberTextPending]}
            numberOfLines={1}
          >
            #{household.houseNumber}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.headName} numberOfLines={1}>
            {household.headName}
          </Text>
          {/* Sync Status Badge */}
          {isPendingSync ? (
            <View style={styles.pendingPill}>
              <Ionicons name="cloud-upload" size={10} color={Colors.amber600} />
              <Text style={styles.pendingText}>Queued</Text>
            </View>
          ) : (
            <View style={styles.syncedPill}>
              <Ionicons name="checkmark-circle" size={10} color={Colors.emerald600} />
              <Text style={styles.syncedText}>Synced</Text>
            </View>
          )}
        </View>

        {/* UID & Ward Row */}
        <View style={styles.metaRow}>
          <Text style={styles.uidText} numberOfLines={1}>
            {household.uid}
          </Text>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.wardText} numberOfLines={1}>
            {household.ward}
          </Text>
        </View>

        {/* Phone & GPS Indicators */}
        <View style={styles.footerRow}>
          {household.phone ? (
            <View style={styles.phoneTag}>
              <Ionicons name="call" size={11} color={Colors.slate400} />
              <Text style={styles.phoneText}>{household.phone}</Text>
            </View>
          ) : (
            <Text style={styles.noPhoneText}>No phone</Text>
          )}

          {household.latitude && household.longitude && (
            <View style={styles.gpsTag}>
              <Ionicons name="navigate" size={10} color={Colors.emerald600} />
              <Text style={styles.gpsText}>GPS Captured</Text>
            </View>
          )}
        </View>
      </View>
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.slate100,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  left: {
    justifyContent: 'flex-start',
  },
  houseBadge: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.emerald50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.emerald100,
    paddingHorizontal: 2,
  },
  houseBadgePending: {
    backgroundColor: '#fffbeb',
    borderColor: '#fed7aa',
  },
  houseNumberText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
    marginTop: 2,
  },
  houseNumberTextPending: {
    color: Colors.amber600,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  headName: {
    fontSize: 15,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate900,
    flex: 1,
    marginRight: 6,
  },
  syncedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: Colors.emerald50,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  syncedText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.emerald700,
  },
  pendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#fffbeb',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  pendingText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.amber600,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  uidText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
  },
  bullet: {
    fontSize: 10,
    color: Colors.slate300,
  },
  wardText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
  },
  noPhoneText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    fontStyle: 'italic',
  },
  gpsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: Colors.emerald50,
    borderRadius: BorderRadius.sm,
  },
  gpsText: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.emerald700,
  },
});
