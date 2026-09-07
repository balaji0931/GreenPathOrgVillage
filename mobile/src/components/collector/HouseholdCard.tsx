/**
 * Household Card for Collector Home
 *
 * Shows household name, house number, UID, and collection status.
 * Matches web collector dashboard household list items.
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { Household } from '../../types/collector';

interface HouseholdCardProps {
  household: Household;
  isCollectedToday?: boolean;
  collectionTime?: string;
  onPress: (household: Household) => void;
}

export function HouseholdCard({
  household,
  isCollectedToday = false,
  collectionTime,
  onPress,
}: HouseholdCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isCollectedToday ? styles.cardCollected : styles.cardPending,
      ]}
      onPress={() => onPress(household)}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        {/* Status Avatar Circle */}
        <View
          style={[
            styles.avatarCircle,
            isCollectedToday ? styles.avatarCollected : styles.avatarPending,
          ]}
        >
          {isCollectedToday ? (
            <Ionicons name="checkmark-sharp" size={22} color={Colors.emerald600} />
          ) : (
            <Ionicons name="add-sharp" size={24} color={Colors.amber600} />
          )}
        </View>

        {/* Info Column */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {household.headName}
          </Text>

          <View style={styles.tagRow}>
            <View style={styles.houseTag}>
              <Ionicons name="home" size={12} color={Colors.slate600} />
              <Text style={styles.tagText}>{household.houseNumber}</Text>
            </View>
            <View style={styles.uidTag}>
              <Text style={styles.uidText}>ID: {household.uid}</Text>
            </View>
          </View>

          {isCollectedToday && (
            <View style={styles.timestampRow}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.emerald600} />
              <Text style={styles.timestampText}>
                {collectionTime ? `Collected at ${collectionTime}` : 'Collected today'}
              </Text>
            </View>
          )}
        </View>

        {/* Trailing Status Indicator */}
        <View style={styles.trailing}>
          <View
            style={[
              styles.statusDot,
              isCollectedToday ? styles.statusDotCollected : styles.statusDotPending,
            ]}
          />
          <Ionicons
            name="chevron-forward"
            size={18}
            color={isCollectedToday ? Colors.emerald600 : Colors.slate400}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    ...Shadows.sm,
  },
  cardPending: {
    borderColor: Colors.slate200,
  },
  cardCollected: {
    borderColor: Colors.emerald100,
    backgroundColor: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCollected: {
    backgroundColor: Colors.emerald50,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  avatarPending: {
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate900,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  houseTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.slate100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs + 2,
  },
  tagText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
  },
  uidTag: {
    backgroundColor: Colors.slate50,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs + 2,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  uidText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timestampText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.emerald600,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotCollected: {
    backgroundColor: Colors.emerald500,
  },
  statusDotPending: {
    backgroundColor: '#fcd34d',
  },
});
