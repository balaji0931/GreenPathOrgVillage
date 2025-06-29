import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Avatar, Divider } from 'react-native-paper';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useOffline } from '@/hooks/useOffline';
import { theme } from '@/utils/theme';

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { pendingCollections, pendingFiles } = useOffline();

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <Card style={styles.headerCard}>
        <Card.Content style={styles.headerContent}>
          <Avatar.Text 
            size={80} 
            label={user?.name?.charAt(0) || 'U'}
            style={styles.avatar}
          />
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.role}>{user?.role?.toUpperCase()}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </Card.Content>
      </Card>

      {/* Personal Information */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>{t('profile', 'personalInfo')}</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('profile', 'phone')}:</Text>
            <Text style={styles.infoValue}>{user?.phone || 'Not provided'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('profile', 'village')}:</Text>
            <Text style={styles.infoValue}>{user?.villageId || 'Not assigned'}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Offline Status */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Offline Data</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pending Collections:</Text>
            <Text style={styles.infoValue}>{pendingCollections.length}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pending Files:</Text>
            <Text style={styles.infoValue}>{pendingFiles.length}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Language Settings */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>{t('profile', 'language')}</Text>
          <Divider style={styles.divider} />
          
          <View style={styles.languageContainer}>
            <Button
              mode={language === 'en' ? 'contained' : 'outlined'}
              onPress={() => setLanguage('en')}
              style={styles.languageButton}
              compact
            >
              English
            </Button>
            <Button
              mode={language === 'hi' ? 'contained' : 'outlined'}
              onPress={() => setLanguage('hi')}
              style={styles.languageButton}
              compact
            >
              हिंदी
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Logout */}
      <Card style={styles.card}>
        <Card.Content>
          <Button
            mode="contained"
            onPress={logout}
            style={styles.logoutButton}
            buttonColor={theme.colors.error}
          >
            {t('auth', 'logout')}
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
  headerCard: {
    elevation: 3,
    marginBottom: theme.spacing.lg,
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  avatar: {
    backgroundColor: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.xs,
  },
  role: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  email: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  card: {
    elevation: 2,
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.sm,
  },
  divider: {
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: theme.colors.onSurface,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  languageButton: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
  },
  logoutButton: {
    marginTop: theme.spacing.sm,
  },
});

export default ProfileScreen;