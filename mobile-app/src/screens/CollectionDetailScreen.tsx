import React from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import { format } from 'date-fns';
import { theme } from '@/utils/theme';
import { Collection } from '@/types';

interface RouteParams {
  collection: Collection;
}

const CollectionDetailScreen: React.FC = () => {
  const route = useRoute();
  const { collection } = route.params as RouteParams;

  const renderRatingStars = (rating: number) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Collection Details</Text>
          
          <View style={styles.headerInfo}>
            <Text style={styles.householdName}>{collection.householdName}</Text>
            <Text style={styles.timestamp}>
              {format(new Date(collection.collectedAt), 'MMM dd, yyyy HH:mm')}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Segregation Rating</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>
              {renderRatingStars(collection.segregationRating)} ({collection.segregationRating}/5)
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Collection Status</Text>
          <View style={styles.statusContainer}>
            <Chip 
              style={[styles.chip, collection.isSegregated ? styles.successChip : styles.errorChip]}
              textStyle={{ color: '#FFFFFF' }}
            >
              {collection.isSegregated ? '✅ Segregated' : '❌ Not Segregated'}
            </Chip>
            <Chip 
              style={[styles.chip, collection.isRecycled ? styles.successChip : styles.errorChip]}
              textStyle={{ color: '#FFFFFF' }}
            >
              {collection.isRecycled ? '♻️ Recyclable' : '🚫 Not Recyclable'}
            </Chip>
            <Chip 
              style={[styles.chip, collection.hasCompost ? styles.successChip : styles.errorChip]}
              textStyle={{ color: '#FFFFFF' }}
            >
              {collection.hasCompost ? '🌱 Compost' : '🚫 No Compost'}
            </Chip>
          </View>

          {collection.feedback && (
            <>
              <Text style={styles.sectionTitle}>Feedback</Text>
              <Text style={styles.feedback}>{collection.feedback}</Text>
            </>
          )}

          {collection.photoUrl && (
            <>
              <Text style={styles.sectionTitle}>Photo</Text>
              <Image source={{ uri: collection.photoUrl }} style={styles.photo} />
            </>
          )}

          {collection.voiceUrl && (
            <>
              <Text style={styles.sectionTitle}>Voice Note</Text>
              <Text style={styles.voiceNote}>🎤 Voice recording available</Text>
            </>
          )}

          <Text style={styles.sectionTitle}>Collector</Text>
          <Text style={styles.collectorName}>{collection.collectorName || 'Unknown'}</Text>
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
  headerInfo: {
    marginBottom: theme.spacing.lg,
  },
  householdName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  timestamp: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  ratingText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  chip: {
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  successChip: {
    backgroundColor: theme.colors.success,
  },
  errorChip: {
    backgroundColor: theme.colors.error,
  },
  feedback: {
    fontSize: 16,
    lineHeight: 24,
    backgroundColor: theme.colors.surfaceVariant,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  voiceNote: {
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  collectorName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
});

export default CollectionDetailScreen;