import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import { format } from 'date-fns';
import { theme } from '@/utils/theme';
import { Issue } from '@/types';

interface RouteParams {
  issue: Issue;
}

const IssueDetailScreen: React.FC = () => {
  const route = useRoute();
  const { issue } = route.params as RouteParams;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#FF9800';
      case 'in_progress': return '#2196F3';
      case 'resolved': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>{issue.title}</Text>
          
          <View style={styles.statusContainer}>
            <Chip 
              style={[styles.chip, { backgroundColor: getStatusColor(issue.status) }]}
              textStyle={{ color: '#FFFFFF' }}
            >
              {issue.status.toUpperCase()}
            </Chip>
            <Chip 
              style={[styles.chip, { backgroundColor: getPriorityColor(issue.priority) }]}
              textStyle={{ color: '#FFFFFF' }}
            >
              {issue.priority.toUpperCase()} PRIORITY
            </Chip>
          </View>

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{issue.description}</Text>

          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reported by:</Text>
            <Text style={styles.detailValue}>{issue.householdName || 'Unknown'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reported on:</Text>
            <Text style={styles.detailValue}>
              {format(new Date(issue.reportedAt), 'MMM dd, yyyy HH:mm')}
            </Text>
          </View>
          {issue.resolvedAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Resolved on:</Text>
              <Text style={styles.detailValue}>
                {format(new Date(issue.resolvedAt), 'MMM dd, yyyy HH:mm')}
              </Text>
            </View>
          )}

          {issue.managerReply && (
            <>
              <Text style={styles.sectionTitle}>Manager Reply</Text>
              <Text style={styles.reply}>{issue.managerReply}</Text>
            </>
          )}
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
  statusContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  chip: {
    marginRight: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.onSurface,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  reply: {
    fontSize: 16,
    lineHeight: 24,
    backgroundColor: theme.colors.surfaceVariant,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
});

export default IssueDetailScreen;