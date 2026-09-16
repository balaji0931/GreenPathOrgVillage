/**
 * GreenPath Village Manager — Tab 2: Collection Media Modal
 *
 * Media popup previewing:
 * - Full-size collection proof photo with written remarks card
 * - Voice recording playback (via expo-audio) with written remarks quote
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { VoiceSoundwavePlayer } from './VoiceSoundwavePlayer';
import { ExpandableText } from '../../../components/common/ExpandableText';

interface CollectionMediaModalProps {
  type: 'photo' | 'voice';
  url: string | null;
  remarks?: string | null;
  onClose: () => void;
}

export function CollectionMediaModal({
  type,
  url,
  remarks,
  onClose,
}: CollectionMediaModalProps) {
  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color={Colors.slate700} />
          </TouchableOpacity>

          {type === 'photo' ? (
            <View style={styles.photoBody}>
              {url ? (
                <Image
                  source={{ uri: url }}
                  style={styles.fullPhoto}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.emptyPhotoBox}>
                  <Ionicons name="camera-outline" size={48} color={Colors.slate400} />
                  <Text style={styles.emptyPhotoText}>No Photo Available</Text>
                </View>
              )}

              <View style={styles.remarksSection}>
                <Text style={styles.remarksLabel}>Remarks</Text>
                <ExpandableText
                  text={remarks && remarks.trim().length > 0 ? remarks : 'No additional remarks provided.'}
                  numberOfLines={3}
                  charLimit={100}
                  style={styles.remarksText}
                  readMoreColor={Colors.emerald700}
                />
              </View>
            </View>
          ) : (
            <View style={styles.voiceBody}>
              <Text style={styles.voiceTitle}>Voice Recording</Text>

              {url ? (
                <View style={styles.voicePlayerWrap}>
                  <VoiceSoundwavePlayer voiceUrl={url} activeColor={Colors.purple600} />
                </View>
              ) : (
                <View style={styles.emptyVoiceBox}>
                  <Ionicons name="volume-mute-outline" size={36} color={Colors.slate400} />
                  <Text style={styles.emptyVoiceText}>No Audio File</Text>
                </View>
              )}

              <View style={styles.remarksSection}>
                <Text style={styles.remarksLabel}>Remarks</Text>
                <ExpandableText
                  text={remarks && remarks.trim().length > 0 ? `"${remarks}"` : 'No written remarks.'}
                  numberOfLines={3}
                  charLimit={100}
                  style={[styles.remarksText, styles.italicRemarks]}
                  readMoreColor={Colors.purple600}
                />
              </View>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.lg,
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  photoBody: {
    width: '100%',
  },
  fullPhoto: {
    width: '100%',
    height: 320,
    backgroundColor: Colors.slate900,
  },
  emptyPhotoBox: {
    width: '100%',
    height: 240,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  emptyPhotoText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  voiceBody: {
    padding: Spacing.xl,
  },
  voiceTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },
  voicePlayerWrap: {
    marginBottom: Spacing.md,
  },
  emptyVoiceBox: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  emptyVoiceText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    textTransform: 'uppercase',
  },
  remarksSection: {
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
  },
  remarksLabel: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  remarksText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate800,
    lineHeight: 18,
  },
  italicRemarks: {
    fontStyle: 'italic',
  },
});
