import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  FAB,
  Badge,
  Avatar,
  IconButton,
  Surface,
  Divider,
} from 'react-native-paper';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useOffline } from '@/hooks/useOffline';
import { apiService } from '@/services/ApiService';
import { theme } from '@/utils/theme';
import { DashboardStats, Collection } from '@/types';

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

// Home Tab Component
const HomeTab: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isOnline, pendingCollections } = useOffline();
  const navigation = useNavigation();

  const { data: stats, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ['/api/stats/collector', user?.villageId],
    queryFn: () => apiService.getDashboardStats('collector', user?.villageId).then(res => res.data),
    enabled: !!user?.villageId,
  });

  const { data: recentCollections, refetch: refetchCollections } = useQuery<Collection[]>({
    queryKey: ['/api/collections', user?.id],
    queryFn: () => apiService.getCollections({ collectorId: user?.id, limit: 5 }).then(res => res.data),
    enabled: !!user?.id,
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchCollections()]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <Surface style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>
              {t('common', 'welcome')}, {user?.name || 'Collector'}! 👋
            </Text>
            <Text style={styles.subGreeting}>
              {format(new Date(), 'EEEE, MMM dd')}
            </Text>
          </View>
          <View style={styles.statusContainer}>
            <Badge
              style={[
                styles.statusBadge,
                { backgroundColor: isOnline ? theme.colors.success : theme.colors.warning }
              ]}
            >
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            {pendingCollections.length > 0 && (
              <Badge style={styles.pendingBadge}>
                {pendingCollections.length} pending
              </Badge>
            )}
          </View>
        </View>
      </Surface>

      {/* Today's Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>{t('dashboard', 'stats')}</Text>
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Text style={styles.statNumber}>{stats?.collectionsToday || 0}</Text>
              <Text style={styles.statLabel}>{t('dashboard', 'collectionsToday')}</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Text style={styles.statNumber}>{stats?.avgSegregationRating?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.statLabel}>{t('dashboard', 'avgRating')}</Text>
            </Card.Content>
          </Card>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('QRScanner' as never)}
          >
            <Text style={styles.actionIcon}>📱</Text>
            <Text style={styles.actionText}>{t('collection', 'scanQR')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.secondary }]}
            onPress={() => navigation.navigate('Profile' as never)}
          >
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionText}>{t('dashboard', 'profile')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Collections */}
      <View style={styles.recentContainer}>
        <Text style={styles.sectionTitle}>Recent Collections</Text>
        {recentCollections && recentCollections.length > 0 ? (
          recentCollections.map((collection) => (
            <Card key={collection.id} style={styles.collectionCard}>
              <Card.Content>
                <View style={styles.collectionHeader}>
                  <Text style={styles.householdName}>{collection.householdName}</Text>
                  <Text style={styles.collectionTime}>
                    {format(new Date(collection.collectedAt), 'HH:mm')}
                  </Text>
                </View>
                <View style={styles.collectionDetails}>
                  <View style={styles.ratingContainer}>
                    <Text style={styles.ratingText}>
                      {collection.segregationRating}/5 ⭐
                    </Text>
                  </View>
                  <View style={styles.statusIcons}>
                    {collection.isSegregated && <Text style={styles.statusIcon}>♻️</Text>}
                    {collection.hasCompost && <Text style={styles.statusIcon}>🌱</Text>}
                    {collection.photoUrl && <Text style={styles.statusIcon}>📷</Text>}
                    {collection.voiceUrl && <Text style={styles.statusIcon}>🎤</Text>}
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Text style={styles.emptyText}>No collections yet today</Text>
              <Text style={styles.emptySubtext}>Start collecting by scanning QR codes!</Text>
            </Card.Content>
          </Card>
        )}
      </View>
    </ScrollView>
  );
};

// Scan Tab Component
const ScanTab: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();

  return (
    <View style={styles.scanContainer}>
      <View style={styles.scanContent}>
        <Text style={styles.scanTitle}>{t('collection', 'scanQR')}</Text>
        <Text style={styles.scanSubtitle}>{t('collection', 'scanInstruction')}</Text>
        
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => navigation.navigate('QRScanner' as never)}
        >
          <Text style={styles.scanButtonIcon}>📱</Text>
          <Text style={styles.scanButtonText}>Start Scanning</Text>
        </TouchableOpacity>
        
        <Text style={styles.scanNote}>
          Point your camera at a household QR code to begin collection
        </Text>
      </View>
    </View>
  );
};

// Profile Tab Component
const ProfileTab: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { pendingCollections, pendingFiles } = useOffline();

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.profileHeader}>
        <Avatar.Text 
          size={80} 
          label={user?.name?.charAt(0) || 'C'}
          style={styles.avatar}
        />
        <Text style={styles.profileName}>{user?.name}</Text>
        <Text style={styles.profileRole}>{user?.role?.toUpperCase()}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
      </Surface>

      <View style={styles.profileSections}>
        {/* Personal Info */}
        <Card style={styles.profileCard}>
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
        <Card style={styles.profileCard}>
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

        {/* Language Setting */}
        <Card style={styles.profileCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>{t('profile', 'language')}</Text>
            <Divider style={styles.divider} />
            <View style={styles.languageContainer}>
              <TouchableOpacity
                style={[
                  styles.languageButton,
                  language === 'en' && styles.languageButtonActive
                ]}
                onPress={() => setLanguage('en')}
              >
                <Text style={styles.languageText}>English</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.languageButton,
                  language === 'hi' && styles.languageButtonActive
                ]}
                onPress={() => setLanguage('hi')}
              >
                <Text style={styles.languageText}>हिंदी</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        {/* Logout */}
        <Card style={styles.profileCard}>
          <Card.Content>
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Text style={styles.logoutText}>{t('auth', 'logout')}</Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>
      </div>
    </ScrollView>
  );
};

// Main Collector Dashboard
const CollectorDashboard: React.FC = () => {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeTab}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => (
            <Text style={focused ? styles.tabIconActive : styles.tabIcon}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanTab}
        options={{
          tabBarLabel: 'Scan',
          tabBarIcon: ({ focused }) => (
            <Text style={focused ? styles.tabIconActive : styles.tabIcon}>📱</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileTab}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => (
            <Text style={focused ? styles.tabIconActive : styles.tabIcon}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    elevation: 2,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subGreeting: {
    fontSize: 14,
    color: '#E0E0E0',
    marginTop: 4,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    color: '#FFFFFF',
    marginBottom: 4,
  },
  pendingBadge: {
    backgroundColor: theme.colors.warning,
    color: '#FFFFFF',
  },
  statsContainer: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onBackground,
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
  },
  actionsContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    marginHorizontal: theme.spacing.xs,
    alignItems: 'center',
    elevation: 2,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: theme.spacing.sm,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  recentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  collectionCard: {
    marginBottom: theme.spacing.md,
    elevation: 1,
  },
  collectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  householdName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  collectinTime: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  collectionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: theme.colors.onSurface,
  },
  statusIcons: {
    flexDirection: 'row',
  },
  statusIcon: {
    fontSize: 16,
    marginLeft: theme.spacing.xs,
  },
  emptyCard: {
    elevation: 1,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  // Scan Tab Styles
  scanContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanContent: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  scanTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  scanSubtitle: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  scanButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xxl,
    alignItems: 'center',
    elevation: 4,
    marginBottom: theme.spacing.lg,
  },
  scanButtonIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scanNote: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 280,
  },
  // Profile Tab Styles
  profileHeader: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.primary,
    elevation: 2,
  },
  avatar: {
    backgroundColor: theme.colors.secondary,
    marginBottom: theme.spacing.md,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs,
  },
  profileRole: {
    fontSize: 14,
    color: '#E0E0E0',
    marginBottom: theme.spacing.xs,
  },
  profileEmail: {
    fontSize: 14,
    color: '#E0E0E0',
  },
  profileSections: {
    padding: theme.spacing.lg,
  },
  profileCard: {
    marginBottom: theme.spacing.lg,
    elevation: 2,
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
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceVariant,
    marginHorizontal: theme.spacing.xs,
    alignItems: 'center',
  },
  languageButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  languageText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  logoutButton: {
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Tab Bar Styles
  tabBar: {
    backgroundColor: theme.colors.surface,
    elevation: 8,
    height: 65,
    paddingBottom: theme.spacing.sm,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabIcon: {
    fontSize: 24,
    opacity: 0.6,
  },
  tabIconActive: {
    fontSize: 24,
    opacity: 1,
  },
});

export default CollectorDashboard;