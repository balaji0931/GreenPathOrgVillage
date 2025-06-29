import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Dimensions,
  Image,
  Modal,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Surface,
  ActivityIndicator,
  IconButton,
  TextInput,
  Dialog,
  Portal,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useOffline } from '@/hooks/useOffline';
import { apiService } from '@/services/ApiService';
import { theme } from '@/utils/theme';
import { Household, CollectionForm } from '@/types';

const { width } = Dimensions.get('window');
const audioRecorderPlayer = new AudioRecorderPlayer();

interface RouteParams {
  household: Household;
}

const CollectionFormScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { household } = route.params as RouteParams;
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isOnline, storeOfflineCollection, storeOfflineFile } = useOffline();
  const queryClient = useQueryClient();

  // Form state
  const [segregationRating, setSegregationRating] = useState(0);
  const [isSegregated, setIsSegregated] = useState<boolean | null>(null);
  const [isRecycled, setIsRecycled] = useState<boolean | null>(null);
  const [hasCompost, setHasCompost] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const recordingTimer = useRef<NodeJS.Timeout | null>(null);

  const submitMutation = useMutation({
    mutationFn: async (data: CollectionForm) => {
      if (isOnline) {
        return apiService.createCollection(data);
      } else {
        await storeOfflineCollection(data);
        return { success: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/collector'] });
      
      Alert.alert(
        'Success!',
        t('collection', 'collectionSubmitted'),
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
    onError: (error) => {
      Alert.alert(
        'Error',
        'Failed to submit collection. Please try again.',
        [{ text: 'OK' }]
      );
    },
  });

  const takePhoto = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      maxWidth: 1000,
      maxHeight: 1000,
      storageOptions: {
        skipBackup: true,
        path: 'images',
      },
    };

    launchCamera(options, (response: ImagePickerResponse) => {
      if (response.assets && response.assets[0]) {
        setPhotoUri(response.assets[0].uri || null);
      }
    });
  };

  const startRecording = async () => {
    try {
      setIsRecording(true);
      setRecordingTime(0);
      
      const path = `collection_voice_${Date.now()}.m4a`;
      const result = await audioRecorderPlayer.startRecorder(path);
      
      recordingTimer.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log('Recording started:', result);
    } catch (error) {
      console.error('Recording error:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      
      setIsRecording(false);
      setVoiceUri(result);
      console.log('Recording stopped:', result);
    } catch (error) {
      console.error('Stop recording error:', error);
      setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = () => {
    // Validation
    if (segregationRating === 0) {
      Alert.alert('Required', 'Please rate the segregation quality');
      return;
    }
    if (isSegregated === null) {
      Alert.alert('Required', 'Please indicate if waste is segregated');
      return;
    }
    if (isRecycled === null) {
      Alert.alert('Required', 'Please indicate if waste can be recycled');
      return;
    }
    if (hasCompost === null) {
      Alert.alert('Required', 'Please indicate if there is compost');
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmSubmit = async () => {
    setShowConfirmDialog(false);

    try {
      let finalPhotoUri = photoUri;
      let finalVoiceUri = voiceUri;

      // Handle file uploads for offline mode
      if (!isOnline && (photoUri || voiceUri)) {
        if (photoUri) {
          finalPhotoUri = await storeOfflineFile(photoUri, 'photo');
        }
        if (voiceUri) {
          finalVoiceUri = await storeOfflineFile(voiceUri, 'voice');
        }
      }

      const collectionData: CollectionForm = {
        householdId: household.id,
        segregationRating,
        isSegregated,
        isRecycled,
        hasCompost,
        feedback: feedback.trim() || undefined,
        photoUri: finalPhotoUri || undefined,
        voiceUri: finalVoiceUri || undefined,
      };

      submitMutation.mutate(collectionData);
    } catch (error) {
      Alert.alert('Error', 'Failed to process files. Please try again.');
    }
  };

  const renderRatingButtons = () => (
    <View style={styles.ratingContainer}>
      <Text style={styles.sectionTitle}>{t('collection', 'rateSegregation')}</Text>
      <View style={styles.ratingButtons}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <TouchableOpacity
            key={rating}
            style={[
              styles.ratingButton,
              segregationRating === rating && styles.ratingButtonActive,
            ]}
            onPress={() => setSegregationRating(rating)}
          >
            <Text style={styles.ratingEmoji}>
              {rating <= 2 ? '😞' : rating <= 3 ? '😐' : '😊'}
            </Text>
            <Text style={styles.ratingNumber}>{rating}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingLabel}>
        {segregationRating <= 2 
          ? t('collection', 'needsImprovement')
          : segregationRating <= 3 
          ? t('collection', 'good')
          : t('collection', 'excellent')
        }
      </Text>
    </View>
  );

  const renderYesNoQuestion = (
    title: string,
    value: boolean | null,
    setter: (value: boolean) => void,
    emoji: string
  ) => (
    <View style={styles.questionContainer}>
      <Text style={styles.questionTitle}>
        {emoji} {title}
      </Text>
      <View style={styles.yesNoButtons}>
        <TouchableOpacity
          style={[
            styles.yesNoButton,
            styles.yesButton,
            value === true && styles.yesNoButtonActive,
          ]}
          onPress={() => setter(true)}
        >
          <Text style={styles.yesNoEmoji}>✅</Text>
          <Text style={styles.yesNoText}>{t('common', 'yes')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.yesNoButton,
            styles.noButton,
            value === false && styles.yesNoButtonActive,
          ]}
          onPress={() => setter(false)}
        >
          <Text style={styles.yesNoEmoji}>❌</Text>
          <Text style={styles.yesNoText}>{t('common', 'no')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Household Info Header */}
      <Surface style={styles.header}>
        <Text style={styles.householdName}>{household.headName}</Text>
        <Text style={styles.houseNumber}>House #{household.houseNumber}</Text>
        <Text style={styles.timestamp}>
          {new Date().toLocaleString()}
        </Text>
      </Surface>

      <View style={styles.formContainer}>
        {/* Segregation Rating */}
        <Card style={styles.card}>
          <Card.Content>
            {renderRatingButtons()}
          </Card.Content>
        </Card>

        {/* Yes/No Questions */}
        <Card style={styles.card}>
          <Card.Content>
            {renderYesNoQuestion(
              t('collection', 'isSegregated'),
              isSegregated,
              setIsSegregated,
              '♻️'
            )}
            {renderYesNoQuestion(
              t('collection', 'recycleQuestion'),
              isRecycled,
              setIsRecycled,
              '🔄'
            )}
            {renderYesNoQuestion(
              t('collection', 'compostQuestion'),
              hasCompost,
              setHasCompost,
              '🌱'
            )}
          </Card.Content>
        </Card>

        {/* Photo Capture */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>📷 {t('collection', 'takePhoto')}</Text>
            {photoUri ? (
              <View style={styles.photoContainer}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <TouchableOpacity style={styles.retakeButton} onPress={takePhoto}>
                  <Text style={styles.retakeText}>Retake Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
                <Text style={styles.captureEmoji}>📸</Text>
                <Text style={styles.captureText}>Take Photo</Text>
              </TouchableOpacity>
            )}
          </Card.Content>
        </Card>

        {/* Voice Recording */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>🎤 {t('collection', 'recordVoice')}</Text>
            <View style={styles.voiceContainer}>
              {isRecording ? (
                <View style={styles.recordingContainer}>
                  <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                    <Text style={styles.stopEmoji}>⏹️</Text>
                    <Text style={styles.recordingText}>
                      Recording... {formatTime(recordingTime)}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : voiceUri ? (
                <View style={styles.recordedContainer}>
                  <Text style={styles.recordedText}>✅ Voice recorded</Text>
                  <TouchableOpacity style={styles.rerecordButton} onPress={startRecording}>
                    <Text style={styles.rerecordText}>Record Again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
                  <Text style={styles.recordEmoji}>🎤</Text>
                  <Text style={styles.recordText}>Start Recording</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Additional Notes */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>📝 {t('collection', 'additionalNotes')}</Text>
            <TextInput
              mode="outlined"
              multiline
              numberOfLines={3}
              value={feedback}
              onChangeText={setFeedback}
              placeholder="Optional feedback or notes..."
              style={styles.feedbackInput}
            />
          </Card.Content>
        </Card>

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={submitMutation.isPending}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
        >
          {submitMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitText}>
                {isOnline ? '✅ Submit Collection' : '💾 Save Offline'}
              </Text>
            </>
          )}
        </Button>

        {!isOnline && (
          <Text style={styles.offlineNote}>
            📱 You're offline. This collection will be saved and synced when you're back online.
          </Text>
        )}
      </View>

      {/* Confirmation Dialog */}
      <Portal>
        <Dialog visible={showConfirmDialog} onDismiss={() => setShowConfirmDialog(false)}>
          <Dialog.Title>{t('collection', 'confirmSubmission')}</Dialog.Title>
          <Dialog.Content>
            <Text>
              Are you sure you want to submit this collection for {household.headName}?
            </Text>
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>
                Rating: {segregationRating}/5 ⭐
              </Text>
              <Text style={styles.summaryText}>
                Segregated: {isSegregated ? '✅' : '❌'}
              </Text>
              <Text style={styles.summaryText}>
                Recyclable: {isRecycled ? '✅' : '❌'}
              </Text>
              <Text style={styles.summaryText}>
                Compost: {hasCompost ? '✅' : '❌'}
              </Text>
              {photoUri && <Text style={styles.summaryText}>📷 Photo attached</Text>}
              {voiceUri && <Text style={styles.summaryText}>🎤 Voice note attached</Text>}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowConfirmDialog(false)}>Cancel</Button>
            <Button onPress={confirmSubmit} mode="contained">
              Confirm
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    elevation: 2,
  },
  householdName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs,
  },
  houseNumber: {
    fontSize: 16,
    color: '#E0E0E0',
    marginBottom: theme.spacing.xs,
  },
  timestamp: {
    fontSize: 14,
    color: '#E0E0E0',
  },
  formContainer: {
    padding: theme.spacing.lg,
  },
  card: {
    marginBottom: theme.spacing.lg,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
  },
  // Rating Styles
  ratingContainer: {
    alignItems: 'center',
  },
  ratingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing.md,
  },
  ratingButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 80,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surfaceVariant,
    marginHorizontal: theme.spacing.xs,
    elevation: 2,
  },
  ratingButtonActive: {
    backgroundColor: theme.colors.primary,
    elevation: 4,
  },
  ratingEmoji: {
    fontSize: 32,
    marginBottom: theme.spacing.xs,
  },
  ratingNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  // Question Styles
  questionContainer: {
    marginBottom: theme.spacing.lg,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
  },
  yesNoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  yesNoButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginHorizontal: theme.spacing.sm,
    elevation: 2,
  },
  yesButton: {
    backgroundColor: '#E8F5E8',
  },
  noButton: {
    backgroundColor: '#FFE8E8',
  },
  yesNoButtonActive: {
    elevation: 4,
    transform: [{ scale: 1.05 }],
  },
  yesNoEmoji: {
    fontSize: 32,
    marginBottom: theme.spacing.sm,
  },
  yesNoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  // Photo Styles
  photoContainer: {
    alignItems: 'center',
  },
  photoPreview: {
    width: width - 100,
    height: 200,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  retakeButton: {
    backgroundColor: theme.colors.secondary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  retakeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  captureButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.lg,
    elevation: 2,
  },
  captureEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  captureText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  // Voice Styles
  voiceContainer: {
    alignItems: 'center',
  },
  recordingContainer: {
    alignItems: 'center',
  },
  stopButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: '#FFE8E8',
    borderRadius: theme.borderRadius.lg,
    elevation: 2,
  },
  stopEmoji: {
    fontSize: 32,
    marginBottom: theme.spacing.sm,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#D32F2F',
  },
  recordedContainer: {
    alignItems: 'center',
  },
  recordedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.success,
    marginBottom: theme.spacing.md,
  },
  rerecordButton: {
    backgroundColor: theme.colors.secondary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  rerecordText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  recordButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.lg,
    elevation: 2,
  },
  recordEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  recordText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  // Feedback Styles
  feedbackInput: {
    backgroundColor: theme.colors.surface,
  },
  // Submit Styles
  submitButton: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    elevation: 4,
  },
  submitButtonContent: {
    paddingVertical: theme.spacing.md,
  },
  submitText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  offlineNote: {
    textAlign: 'center',
    marginTop: theme.spacing.md,
    color: theme.colors.warning,
    fontStyle: 'italic',
  },
  // Dialog Styles
  summaryContainer: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.borderRadius.md,
  },
  summaryText: {
    fontSize: 14,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.xs,
  },
});

export default CollectionFormScreen;