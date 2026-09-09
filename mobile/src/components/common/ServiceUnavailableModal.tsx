/**
 * Service Unavailable Modal
 *
 * Displays an alert modal when a collector attempts a write action
 * while their village's GreenPath subscription is expired or inactive.
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface ServiceUnavailableModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export function ServiceUnavailableModal({
  visible,
  onDismiss,
}: ServiceUnavailableModalProps) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Warning Icon Badge */}
          <View style={styles.iconCircle}>
            <Ionicons name="warning" size={30} color={Colors.amber600} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Service Temporarily Unavailable</Text>

          {/* Message Body */}
          <Text style={styles.primaryText}>
            New waste collections cannot be recorded because your village's GreenPath subscription has expired.
          </Text>

          <Text style={styles.secondaryText}>
            Please inform your supervisor or Panchayat secretary.
          </Text>

          {/* Dismiss Button */}
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.dismissButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
    ...Shadows.lg,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontFamily: Typography.fontFamilyBold,
    fontWeight: '700',
    color: Colors.slate900,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  primaryText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily,
    color: Colors.slate700,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  secondaryText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.xl,
  },
  dismissButton: {
    width: '100%',
    height: 46,
    backgroundColor: Colors.slate900,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Typography.fontFamilySemiBold,
    fontWeight: '600',
  },
});
