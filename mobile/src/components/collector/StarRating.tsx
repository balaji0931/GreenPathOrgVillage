/**
 * Star Rating Component
 * Uses proper Ionicons star icons (no emojis):
 * - 5 round circular buttons centered horizontally
 * - Active: gold yellow with white star icon
 * - Inactive: light gray with slate star outline
 * - Rating label badge underneath (e.g. 5 / 5 · Excellent)
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface StarRatingProps {
  value: number;
  maxStars?: number;
  onChange: (rating: number) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Very Poor',
  2: 'Poor',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

export function StarRating({ value, maxStars = 5, onChange }: StarRatingProps) {
  const handlePress = (star: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(star);
  };

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>
        {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => {
          const isFilled = star <= value;
          return (
            <TouchableOpacity
              key={star}
              onPress={() => handlePress(star)}
              activeOpacity={0.7}
              style={[
                styles.starCircle,
                isFilled ? styles.starCircleActive : styles.starCircleInactive,
              ]}
            >
              <Ionicons
                name={isFilled ? 'star' : 'star-outline'}
                size={22}
                color={isFilled ? '#ffffff' : '#94a3b8'}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  starCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starCircleActive: {
    backgroundColor: '#fbbf24',
    ...Shadows.md,
    shadowColor: '#f59e0b',
    transform: [{ scale: 1.05 }],
  },
  starCircleInactive: {
    backgroundColor: '#f1f5f9',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginTop: 2,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: '#92400e',
  },
});
