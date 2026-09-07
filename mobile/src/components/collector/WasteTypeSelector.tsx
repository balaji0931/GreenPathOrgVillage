/**
 * Waste Type Selector Component
 * Multi-select pill chips with proper Ionicons (no emojis):
 * - Wet: leaf icon (#22c55e)
 * - Dry: cube icon (#3b82f6)
 * - Sanitary: medkit icon (#a855f7)
 * - Special Care: warning icon (#eab308)
 * - Mixed: trash icon (#64748b)
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { WasteType } from '../../types/collector';

interface WasteTypeSelectorProps {
  selected: WasteType[];
  onChange: (types: WasteType[]) => void;
}

interface WasteTypeConfig {
  key: WasteType;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  activeColor: string;
}

const WASTE_TYPE_CONFIGS: WasteTypeConfig[] = [
  { key: 'wet', label: 'Wet', iconName: 'leaf', activeColor: '#22c55e' },
  { key: 'dry', label: 'Dry', iconName: 'cube', activeColor: '#3b82f6' },
  { key: 'mixed', label: 'Mixed', iconName: 'trash', activeColor: '#64748b' },
  { key: 'sanitary', label: 'Sanitary', iconName: 'medkit', activeColor: '#a855f7' },
  { key: 'special_care', label: 'Special Care', iconName: 'warning', activeColor: '#eab308' },
];

export function WasteTypeSelector({ selected, onChange }: WasteTypeSelectorProps) {
  const toggleType = (type: WasteType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  return (
    <View style={styles.container}>
      {WASTE_TYPE_CONFIGS.map(({ key, label, iconName, activeColor }) => {
        const isSelected = selected.includes(key);

        return (
          <TouchableOpacity
            key={key}
            style={[
              styles.chip,
              isSelected
                ? [styles.chipSelected, { backgroundColor: activeColor, borderColor: activeColor }]
                : styles.chipUnselected,
            ]}
            onPress={() => toggleType(key)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={iconName}
              size={16}
              color={isSelected ? '#ffffff' : activeColor}
            />
            <Text
              style={[
                styles.chipText,
                isSelected ? styles.chipTextSelected : styles.chipTextUnselected,
              ]}
            >
              {label}
            </Text>
            {isSelected && (
              <Ionicons
                name="checkmark-circle"
                size={14}
                color="#ffffff"
                style={{ marginLeft: 2 }}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
  },
  chipUnselected: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  chipSelected: {
    ...Shadows.sm,
  },
  chipText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
  },
  chipTextUnselected: {
    color: '#475569',
  },
  chipTextSelected: {
    color: '#ffffff',
  },
});
