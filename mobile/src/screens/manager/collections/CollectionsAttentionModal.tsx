/**
 * GreenPath Village Manager — Tab 2: Needs Attention Detail Sheet
 *
 * Full-screen / slide-up modal for critical households:
 * - Photo proof preview
 * - Voice note player with expo-audio
 * - Segregation star rating & collector attribution
 * - Quick Action buttons: Call & Visit (Maps Navigation)
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { VoiceSoundwavePlayer } from './VoiceSoundwavePlayer';
import type { ManagerAttentionHousehold } from '../../../types/manager';

interface CollectionsAttentionModalProps {
  household: ManagerAttentionHousehold | null;
  onClose: () => void;
}

export function CollectionsAttentionModal({
  household,
  onClose,
}: CollectionsAttentionModalProps) {
  if (!household) return null;

  return (
    <Modal
      visible={Boolean(household)}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={Colors.slate700} />
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              <Text style={styles.headName} numberOfLines={1}>
                {household.headName}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{household.uid}</Text>
                <View style={styles.metaDot} />
                <Text style={styles.metaText}>{household.ward}</Text>
              </View>
            </View>
          </View>

          {/* Main Photo Area */}
          <View style={styles.photoContainer}>
            {household.photoUrl ? (
              <Image
                source={{ uri: household.photoUrl }}
                style={styles.photoImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera-outline" size={48} color={Colors.slate500} />
                <Text style={styles.photoPlaceholderText}>No Collection Photo</Text>
              </View>
            )}
          </View>

          {/* Stacked Bottom Detail Area */}
          <View style={styles.bottomStack}>
            {/* WhatsApp/Telegram style soundwave player */}
            {household.voiceUrl ? (
              <View style={styles.voiceWrapper}>
                <VoiceSoundwavePlayer voiceUrl={household.voiceUrl} activeColor={Colors.slate900} />
              </View>
            ) : null}

            {/* Rating & Collector info */}
            <View style={styles.ratingRow}>
              <View style={styles.ratingLeft}>
                <Text style={styles.sectionCaption}>Segregation Rating</Text>
                <View style={styles.starsWrapper}>
                  <Text style={styles.ratingNumber}>
                    {household.segregationRating || 0}
                  </Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = star <= (household.segregationRating || 0);
                      return (
                        <Ionicons
                          key={star}
                          name={isFilled ? 'star' : 'star-outline'}
                          size={16}
                          color={isFilled ? Colors.destructive : Colors.slate300}
                        />
                      );
                    })}
                  </View>
                </View>
              </View>

              <View style={styles.collectorRight}>
                <Text style={styles.sectionCaption}>Collector</Text>
                <Text style={styles.collectorName} numberOfLines={1}>
                  {household.collectorName || 'Field Staff'}
                </Text>
              </View>
            </View>

            {/* Call & Visit Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.callBtn]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  if (household.phone) {
                    Linking.openURL(`tel:${household.phone}`);
                  } else {
                    Alert.alert('Notice', 'No phone number on record for this household.');
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={18} color={Colors.white} />
                <Text style={styles.actionBtnText}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.visitBtn]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  if (household.latitude && household.longitude) {
                    Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${household.latitude},${household.longitude}`
                    );
                  } else {
                    Alert.alert('Notice', 'No GPS coordinates on record for this household.');
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="navigate" size={18} color={Colors.white} />
                <Text style={styles.actionBtnText}>Visit / Map</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}



const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    gap: Spacing.md,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headName: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.slate300,
  },
  photoContainer: {
    flex: 1,
    backgroundColor: Colors.slate900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  photoPlaceholderText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bottomStack: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    ...Shadows.md,
  },
  voiceWrapper: {
    marginBottom: Spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  ratingLeft: {
    gap: 4,
  },
  sectionCaption: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  starsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ratingNumber: {
    fontSize: 20,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.destructive,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  collectorRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  collectorName: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    maxWidth: 160,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    ...Shadows.sm,
  },
  callBtn: {
    backgroundColor: Colors.emerald600,
  },
  visitBtn: {
    backgroundColor: Colors.blue600,
  },
  actionBtnText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.white,
  },
});
