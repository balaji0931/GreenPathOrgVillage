/**
 * Collection Details Modal Component
 *
 * Custom modal displayed when a collector taps on a household that has
 * already been collected today. Matches the web collector-dashboard dialog:
 * - Green/Red household status banner
 * - Collection time, status, star rating, weight, waste types
 * - Collection photo preview (if taken)
 * - Voice note and remarks
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { Household } from '../../types/collector';

export interface CollectionRecordDetail {
  status: 'collected' | 'missed';
  collectionDate: string;
  segregationRating: number;
  wasteTypes?: string[];
  weightKg?: string;
  remarks?: string;
  photoUrl?: string;
  voiceUrl?: string;
  missedReason?: string;
}

interface CollectionDetailsModalProps {
  visible: boolean;
  household: Household | null;
  collection: CollectionRecordDetail | null;
  onClose: () => void;
}

export function CollectionDetailsModal({
  visible,
  household,
  collection,
  onClose,
}: CollectionDetailsModalProps) {
  if (!household || !collection) return null;

  const isCollected = collection.status === 'collected';

  const formattedTime = collection.collectionDate
    ? new Date(collection.collectionDate).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '—';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Collection Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={Colors.slate500} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Household Banner (matches web bg-green-50 rounded-xl) */}
            <View style={[styles.heroBanner, isCollected ? styles.heroBannerCollected : styles.heroBannerMissed]}>
              <View style={[styles.heroIconBox, isCollected ? styles.heroIconBoxCollected : styles.heroIconBoxMissed]}>
                <Ionicons
                  name={isCollected ? 'checkmark-circle' : 'close-circle'}
                  size={28}
                  color={isCollected ? '#15803d' : '#b91c1c'}
                />
              </View>
              <Text style={styles.residentName} numberOfLines={1}>
                {household.headName || 'Household'}
              </Text>
              <Text style={styles.householdSubtitle}>
                H.No: {household.houseNumber || '—'} · UID: {household.uid}
              </Text>
              <View style={[styles.statusBadge, isCollected ? styles.statusBadgeCollected : styles.statusBadgeMissed]}>
                <Ionicons
                  name={isCollected ? 'checkmark' : 'alert-circle'}
                  size={12}
                  color={isCollected ? '#15803d' : '#b91c1c'}
                />
                <Text style={[styles.statusBadgeText, isCollected ? styles.statusBadgeTextCollected : styles.statusBadgeTextMissed]}>
                  {isCollected ? 'Already Collected Today' : `Not Collected · ${collection.missedReason || 'Missed'}`}
                </Text>
              </View>
            </View>

            {/* Collection Metadata Card */}
            <View style={styles.infoCard}>
              <View style={styles.gridRow}>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>STATUS</Text>
                  <Text style={[styles.gridValue, isCollected ? styles.gridValueCollected : styles.gridValueMissed]}>
                    {isCollected ? 'Collected' : 'Not Collected'}
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>TIME</Text>
                  <Text style={styles.gridValue}>{formattedTime}</Text>
                </View>
              </View>

              <View style={styles.gridRow}>
                {isCollected ? (
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>SEGREGATION</Text>
                    <View style={styles.ratingRow}>
                      <Text style={styles.gridValue}>{collection.segregationRating}/5</Text>
                      <Ionicons name="star" size={14} color="#eab308" style={{ marginLeft: 4 }} />
                    </View>
                  </View>
                ) : (
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>REASON</Text>
                    <Text style={styles.gridValue}>{collection.missedReason || '—'}</Text>
                  </View>
                )}

                {collection.weightKg ? (
                  <View style={styles.gridItem}>
                    <Text style={styles.gridLabel}>WEIGHT</Text>
                    <Text style={styles.gridValue}>{collection.weightKg} kg</Text>
                  </View>
                ) : null}
              </View>

              {/* Waste Types Chips */}
              {isCollected && collection.wasteTypes && collection.wasteTypes.length > 0 && (
                <View style={styles.sectionCol}>
                  <Text style={styles.sectionLabel}>WASTE TYPES</Text>
                  <View style={styles.chipsRow}>
                    {collection.wasteTypes.map((type) => (
                      <View key={type} style={styles.typeChip}>
                        <Text style={styles.typeChipText}>{type.replace('_', ' ')}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Remarks Box */}
              {collection.remarks ? (
                <View style={styles.sectionCol}>
                  <View style={styles.labelWithIcon}>
                    <Ionicons name="chatbubble-ellipses-outline" size={13} color="#64748b" />
                    <Text style={styles.sectionLabel}>REMARKS</Text>
                  </View>
                  <View style={styles.remarksBox}>
                    <Text style={styles.remarksText}>{collection.remarks}</Text>
                  </View>
                </View>
              ) : null}

              {/* Photo Display */}
              {collection.photoUrl ? (
                <View style={styles.sectionCol}>
                  <View style={styles.labelWithIcon}>
                    <Ionicons name="camera-outline" size={13} color="#64748b" />
                    <Text style={styles.sectionLabel}>COLLECTION PHOTO</Text>
                  </View>
                  <View style={styles.photoContainer}>
                    <Image source={{ uri: collection.photoUrl }} style={styles.photoImage} resizeMode="cover" />
                  </View>
                </View>
              ) : null}

              {/* Voice Note Badge */}
              {collection.voiceUrl ? (
                <View style={styles.voiceCard}>
                  <Ionicons name="mic" size={18} color="#0284c7" />
                  <Text style={styles.voiceText}>Voice Remark Recorded</Text>
                </View>
              ) : null}
            </View>
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={styles.actionBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.actionBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.xxl,
    padding: 18,
    ...Shadows.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: Typography.fontFamilyBold,
    color: '#0f172a',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    marginTop: 14,
  },
  heroBanner: {
    borderRadius: BorderRadius.xl,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 12,
  },
  heroBannerCollected: {
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
  },
  heroBannerMissed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  heroIconBoxCollected: {
    backgroundColor: '#dcfce7',
  },
  heroIconBoxMissed: {
    backgroundColor: '#fee2e2',
  },
  residentName: {
    fontSize: 17,
    fontFamily: Typography.fontFamilyBold,
    color: '#0f172a',
    textAlign: 'center',
  },
  householdSubtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeCollected: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeMissed: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilySemiBold,
  },
  statusBadgeTextCollected: {
    color: '#15803d',
  },
  statusBadgeTextMissed: {
    color: '#b91c1c',
  },
  infoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: BorderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridItem: {
    flex: 1,
    gap: 2,
  },
  gridLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: '#64748b',
    letterSpacing: 0.5,
  },
  gridValue: {
    fontSize: 14,
    fontFamily: Typography.fontFamilySemiBold,
    color: '#1e293b',
  },
  gridValueCollected: {
    color: '#15803d',
  },
  gridValueMissed: {
    color: '#b91c1c',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionCol: {
    gap: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: '#64748b',
    letterSpacing: 0.5,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  typeChipText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: '#334155',
    textTransform: 'capitalize',
  },
  remarksBox: {
    backgroundColor: '#ffffff',
    borderRadius: BorderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  remarksText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    color: '#334155',
    lineHeight: 18,
  },
  photoContainer: {
    height: 140,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e0f2fe',
    padding: 10,
    borderRadius: BorderRadius.md,
  },
  voiceText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: '#0369a1',
  },
  actionBtn: {
    height: 46,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.blue600,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    ...Shadows.sm,
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: '#ffffff',
  },
});
