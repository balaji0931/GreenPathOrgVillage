import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, TextInput, Chip, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { apiService } from '@/services/ApiService';
import { theme } from '@/utils/theme';
import { IssueForm } from '@/types';

const IssueFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: async (data: IssueForm) => {
      return apiService.createIssue(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
      Alert.alert(
        'Success!',
        t('issues', 'issueReported'),
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
    onError: () => {
      Alert.alert('Error', 'Failed to report issue. Please try again.');
    },
  });

  const takePhoto = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      maxWidth: 1000,
      maxHeight: 1000,
    };

    launchCamera(options, (response: ImagePickerResponse) => {
      if (response.assets && response.assets[0]) {
        setImageUri(response.assets[0].uri || null);
      }
    });
  };

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Required', 'Please fill in both title and description');
      return;
    }

    const issueData: IssueForm = {
      title: title.trim(),
      description: description.trim(),
      priority,
      imageUri: imageUri || undefined,
    };

    submitMutation.mutate(issueData);
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>{t('issues', 'reportIssue')}</Text>
          
          <TextInput
            label={t('issues', 'title')}
            value={title}
            onChangeText={setTitle}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label={t('issues', 'description')}
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.input}
          />

          <Text style={styles.sectionTitle}>{t('issues', 'priority')}</Text>
          <View style={styles.priorityContainer}>
            {(['low', 'medium', 'high'] as const).map((p) => (
              <Chip
                key={p}
                selected={priority === p}
                onPress={() => setPriority(p)}
                style={styles.chip}
              >
                {t('issues', p)}
              </Chip>
            ))}
          </View>

          <Button
            mode="outlined"
            onPress={takePhoto}
            style={styles.photoButton}
            icon="camera"
          >
            {t('issues', 'attachPhoto')}
          </Button>

          {imageUri && (
            <Text style={styles.photoText}>📷 Photo attached</Text>
          )}

          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={submitMutation.isPending}
            style={styles.submitButton}
          >
            {submitMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              t('issues', 'submitIssue')
            )}
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  card: {
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: theme.spacing.lg,
  },
  input: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  priorityContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  chip: {
    marginRight: theme.spacing.sm,
  },
  photoButton: {
    marginBottom: theme.spacing.md,
  },
  photoText: {
    textAlign: 'center',
    color: theme.colors.success,
    marginBottom: theme.spacing.md,
  },
  submitButton: {
    marginTop: theme.spacing.lg,
  },
});

export default IssueFormScreen;