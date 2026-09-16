/**
 * GreenPath Village Manager — Tab 2: Household Status Row
 *
 * Enriched premium list item (Strictly preserves compact row height):
 * - Soft-tinted avatar indicators with corner status dot
 * - Segregation star rating badge on collected households (★ 4.5)
 * - Collection timestamp (09:15 AM)
 * - Collector attribution pill
 * - Optional matched text highlighting for focused search mode
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius } from '../../../constants/theme';
import type { ManagerCollectionHousehold } from '../../../types/manager';

interface CollectionsHouseholdRowProps {
  household: ManagerCollectionHousehold;
  onSelect: (household: ManagerCollectionHousehold) => void;
  highlightQuery?: string;
}

export const CollectionsHouseholdRow = React.memo(function CollectionsHouseholdRow({
  household,
  onSelect,
  highlightQuery,
}: CollectionsHouseholdRowProps) {
  const initial = (household.headName || 'H').charAt(0).toUpperCase();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(household);
  };

  const rating = household.segregationRating;
  const isCritical = rating !== null && rating <= 3;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Dynamic Status Indicator Avatar */}
      <View style={styles.avatarWrapper}>
        <View
          style={[
            styles.avatarCircle,
            household.collected ? styles.avatarCollected : styles.avatarPending,
          ]}
        >
          <Text
            style={[
              styles.avatarInitial,
              household.collected ? styles.initialCollected : styles.initialPending,
            ]}
          >
            {initial}
          </Text>
        </View>
        <View
          style={[
            styles.cornerStatusDot,
            household.collected ? styles.dotCollected : styles.dotPending,
          ]}
        />
      </View>

      {/* Middle Content */}
      <View style={styles.middleContent}>
        {/* Top Row: Head Name & Rating / Status */}
        <View style={styles.topRow}>
          <View style={styles.headNameWrap}>
            <HighlightedText
              text={household.headName}
              query={highlightQuery}
              style={styles.headName}
              highlightStyle={styles.textHighlight}
            />
          </View>

          <View style={styles.statusGroup}>
            {/* Segregation Star Rating Pill (if collected and rating available) */}
            {household.collected && rating !== null && rating > 0 ? (
              <View
                style={[
                  styles.ratingPill,
                  isCritical ? styles.ratingPillCritical : styles.ratingPillNormal,
                ]}
              >
                <Ionicons
                  name="star"
                  size={10}
                  color={isCritical ? Colors.destructive : '#ca8a04'}
                />
                <Text
                  style={[
                    styles.ratingPillText,
                    isCritical ? styles.ratingTextCritical : styles.ratingTextNormal,
                  ]}
                >
                  {rating.toFixed(1)}
                </Text>
              </View>
            ) : null}

            <Text
              style={[
                styles.statusText,
                household.collected ? styles.statusCollected : styles.statusPending,
              ]}
            >
              {household.collected ? 'COLLECTED' : 'PENDING'}
            </Text>
          </View>
        </View>

        {/* Bottom Row: House # • Ward, Time & Collector Badge */}
        <View style={styles.bottomRow}>
          <View style={styles.locationGroup}>
            <Ionicons name="location-sharp" size={11} color={Colors.slate400} />
            <HighlightedText
              text={`${household.houseNumber} • ${household.ward}`}
              query={highlightQuery}
              style={styles.locationText}
              highlightStyle={styles.textHighlight}
            />
          </View>

          <View style={styles.bottomRightGroup}>
            {household.collected && household.collectionTime ? (
              <Text style={styles.collectionTimeText} numberOfLines={1}>
                {household.collectionTime}
              </Text>
            ) : null}

            {household.collected && household.collectorName ? (
              <View style={styles.collectorBadge}>
                <Text style={styles.collectorBadgeText} numberOfLines={1}>
                  By {household.collectorName}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Right Chevron */}
      <Ionicons name="chevron-forward" size={15} color={Colors.slate300} />
    </TouchableOpacity>
  );
});

/** Helper component to highlight search matches */
function HighlightedText({
  text,
  query,
  style,
  highlightStyle,
}: {
  text: string;
  query?: string;
  style: any;
  highlightStyle: any;
}) {
  if (!query || !query.trim()) {
    return (
      <Text style={style} numberOfLines={1}>
        {text}
      </Text>
    );
  }
  const q = query.trim().toLowerCase();
  const lower = text.toLowerCase();
  const index = lower.indexOf(q);
  if (index === -1) {
    return (
      <Text style={style} numberOfLines={1}>
        {text}
      </Text>
    );
  }
  const before = text.slice(0, index);
  const match = text.slice(index, index + q.length);
  const after = text.slice(index + q.length);

  return (
    <Text style={style} numberOfLines={1}>
      {before}
      <Text style={highlightStyle}>{match}</Text>
      {after}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    gap: Spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
    width: 40,
    height: 40,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCollected: {
    backgroundColor: '#dcfce7',
  },
  avatarPending: {
    backgroundColor: '#fee2e2',
  },
  avatarInitial: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyBold,
  },
  initialCollected: {
    color: '#15803d',
  },
  initialPending: {
    color: '#dc2626',
  },
  cornerStatusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  dotCollected: {
    backgroundColor: Colors.emerald600,
  },
  dotPending: {
    backgroundColor: Colors.destructive,
  },
  middleContent: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  headNameWrap: {
    flex: 1,
    minWidth: 0,
  },
  headName: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: BorderRadius.sm,
  },
  ratingPillNormal: {
    backgroundColor: '#fef9c3',
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  ratingPillCritical: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  ratingPillText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
  },
  ratingTextNormal: {
    color: '#854d0e',
  },
  ratingTextCritical: {
    color: Colors.destructive,
  },
  statusText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    letterSpacing: 0.8,
  },
  statusCollected: {
    color: Colors.emerald600,
  },
  statusPending: {
    color: Colors.destructive,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  locationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
    minWidth: 0,
  },
  locationText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
  },
  bottomRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  collectionTimeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
  },
  collectorBadge: {
    backgroundColor: Colors.emerald50,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
    maxWidth: 110,
  },
  collectorBadgeText: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
  },
  textHighlight: {
    backgroundColor: '#bbf7d0',
    color: '#14532d',
    fontFamily: Typography.fontFamilyBold,
  },
});
