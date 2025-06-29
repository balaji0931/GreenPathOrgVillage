import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/utils/theme';

const ModeratorDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Moderator Dashboard</Text>
          <Text style={styles.subtitle}>Welcome, {user?.name}!</Text>
          <Text style={styles.description}>
            Full moderator functionality available in web version.
            This mobile app is optimized for collectors.
          </Text>
          <Button mode="contained" onPress={logout} style={styles.button}>
            Logout
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
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: theme.spacing.md,
  },
  description: {
    fontSize: 16,
    marginBottom: theme.spacing.lg,
    lineHeight: 24,
  },
  button: {
    marginTop: theme.spacing.md,
  },
});

export default ModeratorDashboard;