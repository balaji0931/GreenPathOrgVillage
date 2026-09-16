/**
 * GreenPath Village Manager — Tab 2: WhatsApp/Telegram-style Soundwave Audio Player
 *
 * Micro soundwave visualization:
 * - Play/Pause toggle with haptics
 * - Dynamic soundwave bars that fill as playback progresses
 * - Formatted elapsed / remaining duration countdown
 * - Fail-safe audio handling via expo-audio
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Colors, Typography, Spacing, BorderRadius } from '../../../constants/theme';

interface VoiceSoundwavePlayerProps {
  voiceUrl: string;
  activeColor?: string;
}

// 22 soundwave bar heights mimicking real voice frequency peaks
const WAVE_BAR_HEIGHTS = [
  6, 12, 18, 10, 14, 24, 16, 20, 8, 18, 14, 22, 12, 16, 26, 18, 10, 14, 20, 12, 8, 14,
];

export function VoiceSoundwavePlayer({
  voiceUrl,
  activeColor = Colors.slate900,
}: VoiceSoundwavePlayerProps) {
  const player = useAudioPlayer(voiceUrl ? { uri: voiceUrl } : null);
  const playerStatus = useAudioPlayerStatus(player);

  const isPlaying = Boolean(playerStatus?.playing);
  const duration = playerStatus?.duration || 0;
  const currentTime = playerStatus?.currentTime || 0;

  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : isPlaying ? 0.5 : 0;
  const activeBarIndex = Math.floor(progress * WAVE_BAR_HEIGHTS.length);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const timeLabel = isPlaying && duration > 0
    ? `-${formatTime(Math.max(0, duration - currentTime))}`
    : duration > 0
    ? formatTime(duration)
    : 'Voice Note';

  const togglePlayback = () => {
    if (!player) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (isPlaying) {
        player.pause();
      } else {
        if (duration > 0 && currentTime >= duration - 0.2) {
          player.seekTo(0);
        }
        player.play();
      }
    } catch {
      // Audio playback failed silently
    }
  };

  return (
    <View style={styles.container}>
      {/* Circular Play / Pause Button */}
      <TouchableOpacity
        style={[styles.playBtn, { backgroundColor: activeColor }]}
        onPress={togglePlayback}
        activeOpacity={0.8}
      >
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={18}
          color={Colors.white}
          style={isPlaying ? undefined : styles.playIconOffset}
        />
      </TouchableOpacity>

      {/* Soundwave Bars & Duration Column */}
      <View style={styles.waveCol}>
        <View style={styles.barsContainer}>
          {WAVE_BAR_HEIGHTS.map((height, idx) => {
            const isBarActive = idx <= activeBarIndex;
            return (
              <View
                key={idx}
                style={[
                  styles.waveBar,
                  {
                    height,
                    backgroundColor: isBarActive ? activeColor : Colors.slate200,
                  },
                ]}
              />
            );
          })}
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.statusCaption}>
            {isPlaying ? 'Playing Voice Note' : 'Recorded Audio Proof'}
          </Text>
          <Text style={styles.timeText}>{timeLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconOffset: {
    marginLeft: 2,
  },
  waveCol: {
    flex: 1,
    gap: 6,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 28,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusCaption: {
    fontSize: 9,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate400,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  timeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate600,
  },
});
