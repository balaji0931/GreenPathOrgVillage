/**
 * Voice Recorder Component
 *
 * In-place voice recording & playback for collector remarks:
 * - Idle: Clean button with microphone icon ("Record Voice Remark")
 * - Recording: Live timer ("Recording 0:04..."), pulsating indicator, and Stop button
 * - Recorded: In-place audio bar with Play/Pause button, timeline, and 'X' cancel button
 * - Never shows technical errors to the user
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {
  useAudioRecorder,
  useAudioPlayer,
  useAudioPlayerStatus,
  RecordingPresets,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { uploadVoice } from '../../api/upload.api';
import { getFriendlyErrorMessage } from '../../utils/errorMessage';

const MAX_RECORDING_SECONDS = 30;

interface VoiceRecorderProps {
  voiceUrl: string;
  onVoiceCapture: (url: string) => void;
  localOnly?: boolean;
}

export function VoiceRecorder({ voiceUrl, onVoiceCapture, localOnly = false }: VoiceRecorderProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(voiceUrl ? { uri: voiceUrl } : null);
  const playerStatus = useAudioPlayerStatus(player);

  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const { granted, canAskAgain } = await requestRecordingPermissionsAsync();
      if (!granted) {
        if (!canAskAgain) {
          Alert.alert(
            'Microphone Permission',
            'Microphone access is required to record voice remarks. Please enable it in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Settings', onPress: () => Linking.openSettings() },
            ],
          );
        } else {
          Alert.alert('Permission Required', 'Please allow microphone access to record voice remarks.');
        }
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setDuration(0);

      // Expo Audio SDK 57 requires prepareToRecordAsync() before record()
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          const next = prev + 1;
          if (next >= MAX_RECORDING_SECONDS) {
            // Auto-stop recording at limit
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (err: unknown) {
      setIsRecording(false);
      Alert.alert(
        'Recording Error',
        getFriendlyErrorMessage(err, 'Unable to start recording. Please check microphone access.')
      );
    }
  };

  const stopRecording = async () => {
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await recorder.stop();
      const uri = recorder.uri;

      if (uri) {
        if (localOnly) {
          onVoiceCapture(uri);
        } else {
          setIsUploading(true);
          try {
            const url = await uploadVoice(uri);
            onVoiceCapture(url);
          } catch (uploadErr) {
            Alert.alert(
              'Upload Notice',
              getFriendlyErrorMessage(uploadErr, 'Could not upload recording now. It will be stored locally.')
            );
            onVoiceCapture(uri);
          } finally {
            setIsUploading(false);
          }
        }
      }
    } catch (err: unknown) {
      setIsRecording(false);
      Alert.alert(
        'Recording Notice',
        getFriendlyErrorMessage(err, 'Could not complete recording. Please try again.')
      );
    }
  };

  const togglePlayback = () => {
    if (!player) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (playerStatus?.playing) {
        player.pause();
      } else {
        // If at or near end, seek back to 0 before playing
        if (
          playerStatus?.duration &&
          playerStatus?.currentTime &&
          playerStatus.currentTime >= playerStatus.duration - 0.2
        ) {
          player.seekTo(0);
        }
        player.play();
      }
    } catch {
      // Audio playback failed silently
    }
  };

  const cancelRecording = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (player) {
        player.pause();
        player.seekTo(0);
      }
    } catch {}
    onVoiceCapture('');
  };

  if (isUploading) {
    return (
      <View style={styles.uploadContainer}>
        <ActivityIndicator color={Colors.emerald600} size="small" />
        <Text style={styles.uploadText}>Saving voice remark...</Text>
      </View>
    );
  }

  // State 1: A recording exists → Show interactive audio player bar with Play/Pause and 'X'
  if (voiceUrl) {
    const isPlaying = !!playerStatus?.playing;
    const currentSeconds = playerStatus?.currentTime ?? 0;
    const totalSeconds = playerStatus?.duration || duration || 0;

    return (
      <View style={styles.playbackBar}>
        {/* Play / Pause Button */}
        <TouchableOpacity
          style={styles.playBtn}
          onPress={togglePlayback}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={18}
            color="#ffffff"
            style={!isPlaying ? { marginLeft: 2 } : undefined}
          />
        </TouchableOpacity>

        {/* Audio Waveform Info */}
        <View style={styles.audioInfo}>
          <View style={styles.audioMetaRow}>
            <Ionicons name="mic" size={14} color={Colors.emerald700} style={{ marginRight: 4 }} />
            <Text style={styles.audioLabel}>Voice Note</Text>
          </View>
          <Text style={styles.audioTimer}>
            {formatTime(isPlaying ? currentSeconds : totalSeconds)}
            {totalSeconds > 0 && isPlaying ? ` / ${formatTime(totalSeconds)}` : ''}
          </Text>
        </View>

        {/* Cancel / Delete ('X') Button */}
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={cancelRecording}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    );
  }

  // State 2: Actively recording → Red pulsing banner with Stop button
  if (isRecording) {
    return (
      <View style={styles.recordingContainer}>
        <View style={styles.recordingLeft}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording {formatTime(duration)} / {formatTime(MAX_RECORDING_SECONDS)}</Text>
        </View>
        <TouchableOpacity
          style={styles.stopBtn}
          onPress={stopRecording}
          activeOpacity={0.8}
        >
          <Ionicons name="stop" size={14} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.stopBtnText}>Stop</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // State 3: Idle → "Record Voice Remark" button in the same area
  return (
    <TouchableOpacity
      style={styles.idleBtn}
      onPress={startRecording}
      activeOpacity={0.8}
    >
      <Ionicons name="mic-outline" size={18} color="#2563eb" style={{ marginRight: 8 }} />
      <Text style={styles.idleBtnText}>Record Voice Remark</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  idleBtn: {
    width: '100%',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.xl,
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleBtnText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilySemiBold,
    color: '#2563eb',
  },
  recordingContainer: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.xl,
    backgroundColor: '#fef2f2',
    borderWidth: 1.5,
    borderColor: '#fecaca',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  recordingText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: '#b91c1c',
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
  },
  stopBtnText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyBold,
    color: '#ffffff',
  },
  playbackBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    gap: 12,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.emerald600,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  audioInfo: {
    flex: 1,
  },
  audioMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
  },
  audioTimer: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
    marginTop: 1,
  },
  cancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  uploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
    borderRadius: BorderRadius.xl,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  uploadText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
  },
});
