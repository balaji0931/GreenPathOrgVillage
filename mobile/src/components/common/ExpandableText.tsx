/**
 * GreenPath Mobile — Reusable Expandable Text Component
 *
 * Handles truncated text preview with a clickable '...Read more' / 'Show less' toggle.
 * Provides haptic feedback and safe hitSlops for easy mobile tapping.
 */
import React, { useState } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Typography } from '../../constants/theme';

interface ExpandableTextProps {
  text?: string | null;
  numberOfLines?: number;
  charLimit?: number;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  readMoreColor?: string;
  readMoreText?: string;
  showLessText?: string;
}

export function ExpandableText({
  text,
  numberOfLines = 2,
  charLimit = 100,
  style,
  containerStyle,
  readMoreColor = Colors.emerald700,
  readMoreText = '...Read more',
  showLessText = 'Show less',
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return null;

  const trimmed = text.trim();
  const isLong = trimmed.length > charLimit || trimmed.includes('\n');

  if (!isLong) {
    return <Text style={style}>{trimmed}</Text>;
  }

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded((prev) => !prev);
  };

  return (
    <View style={containerStyle}>
      <Text
        style={style}
        numberOfLines={isExpanded ? undefined : numberOfLines}
      >
        {trimmed}
      </Text>
      <TouchableOpacity
        onPress={handleToggle}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.toggleBtn}
      >
        <Text style={[styles.toggleText, { color: readMoreColor }]}>
          {isExpanded ? showLessText : readMoreText}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleBtn: {
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  toggleText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
  },
});
