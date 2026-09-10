/**
 * Mapped QR Code Details Modal — Field Worker
 *
 * Shown when a scanned QR code has already been claimed / mapped.
 * Displays read-only information so the field worker knows this code is in use.
 */
import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { QRCodeData } from '../../types/fieldworker';

interface MappedQRModalProps {
  visible: boolean;
  qrData: QRCodeData | null;
  onClose: () => void;
}

export function MappedQRModal({ visible, qrData, onClose }: MappedQRModalProps) {
  if (!qrData) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Status Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-done" size={32} color={Colors.emerald600} />
          </View>

          <Text style={styles.title}>QR Code Already Mapped</Text>
          <Text style={styles.subtitle}>
            This physical QR sticker is already registered to a household in this village.
          </Text>

          {/* Details Box */}
          <View style={styles.detailsBox}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>QR UID</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{qrData.uid}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Village ID</Text>
              <Text style={styles.detailValue}>{qrData.villageId}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>Mapped</Text>
              </View>
            </View>
            {qrData.batchId && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Batch ID</Text>
                <Text style={styles.detailValue}>{qrData.batchId}</Text>
              </View>
            )}
          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...Shadows.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.emerald50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.emerald100,
  },
  title: {
    fontSize: 17,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate800,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.emerald100,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
  },
  closeButton: {
    width: '100%',
    height: 46,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.slate900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.white,
  },
});
