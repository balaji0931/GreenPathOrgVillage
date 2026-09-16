/**
 * GreenPath Village Manager — Tab 2: Needs Attention Story Strip
 *
 * WhatsApp / Instagram Stories style horizontal avatar strip for
 * households with critical segregation rating (<= 3).
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import type { ManagerAttentionHousehold } from '../../../types/manager';

interface CollectionsNeedsAttentionStripProps {
  items: ManagerAttentionHousehold[];
  onSelect: (household: ManagerAttentionHousehold) => void;
}

export function CollectionsNeedsAttentionStrip({
  items,
  onSelect,
}: CollectionsNeedsAttentionStripProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header with Critical Count Badge */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Needs Attention</Text>
        <View style={styles.criticalBadge}>
          <Text style={styles.criticalBadgeText}>
            {items.length} critical
          </Text>
        </View>
      </View>

      {/* Horizontal Avatar Story Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => {
          const initial = (item.headName || 'H').charAt(0).toUpperCase();

          return (
            <TouchableOpacity
              key={item.householdId}
              style={styles.avatarItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(item);
              }}
              activeOpacity={0.7}
            >
              {/* Outer Ring with Alert Badge */}
              <View style={styles.avatarRing}>
                <View style={styles.avatarInner}>
                  {item.photoUrl ? (
                    <Image
                      source={{ uri: item.photoUrl }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.initialFallback}>
                      <Text style={styles.initialText}>{initial}</Text>
                    </View>
                  )}
                </View>

                {/* Corner Alert Triangle Badge */}
                <View style={styles.alertCornerBadge}>
                  <Ionicons name="warning" size={10} color={Colors.white} />
                </View>
              </View>

              {/* Resident Label */}
              <View style={styles.labelContainer}>
                <Text style={styles.nameText} numberOfLines={1} ellipsizeMode="tail">
                  {item.headName}
                </Text>
                <Text style={styles.houseText} numberOfLines={1}>
                  {item.houseNumber}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  criticalBadge: {
    backgroundColor: Colors.destructiveLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  criticalBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.destructive,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  avatarItem: {
    alignItems: 'center',
    width: 68,
  },
  avatarRing: {
    position: 'relative',
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: Colors.destructive,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    backgroundColor: Colors.slate100,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  initialFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    fontSize: 18,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.destructive,
  },
  alertCornerBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.destructive,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  labelContainer: {
    alignItems: 'center',
    marginTop: 6,
    width: '100%',
  },
  nameText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    textAlign: 'center',
    lineHeight: 12,
  },
  houseText: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
    marginTop: 2,
    textAlign: 'center',
  },
});
