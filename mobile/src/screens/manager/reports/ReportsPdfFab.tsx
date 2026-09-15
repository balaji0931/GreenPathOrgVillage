/**
 * GreenPath Village Manager — Reports Tab: PDF Floating Action Button (FAB)
 *
 * Implements:
 * - Circular floating action button anchored in bottom-right corner
 * - Icon-only design meaning "Download Report" (document file + download arrow)
 * - Haptic feedback on tap
 */
import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Shadows } from '../../../constants/theme';

interface ReportsPdfFabProps {
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function ReportsPdfFab({
  onPress,
  disabled = false,
  isLoading = false,
}: ReportsPdfFabProps) {
  const handlePress = () => {
    if (disabled || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const isButtonDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      style={[styles.fab, isButtonDisabled && styles.fabDisabled]}
      onPress={handlePress}
      activeOpacity={0.85}
      disabled={isButtonDisabled}
      accessibilityLabel="Download Report"
      accessibilityRole="button"
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={Colors.white} />
      ) : (
        <MaterialCommunityIcons name="file-download-outline" size={32} color={Colors.white} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 55,
    height: 55,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.emerald700,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    ...Shadows.lg,
    elevation: 6,
    zIndex: 99,
  },
  fabDisabled: {
    opacity: 0.6,
  },
});
