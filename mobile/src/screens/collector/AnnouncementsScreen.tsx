/**
 * Announcements Screen
 * Village announcements list with "New" badges.
 * Matches web collector-dashboard.tsx announcements tab.
 */
import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { fetchAnnouncements } from '../../api/collector.api';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import type { Announcement } from '../../types/collector';
import { useEffect } from 'react';

export function AnnouncementsScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchAnnouncements();
      setAnnouncements(data);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const isNew = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return diff < 24 * 60 * 60 * 1000; // less than 24 hours
  };

  if (isLoading) return <LoadingState message="Loading announcements..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Announcements</Text>
        <Text style={styles.subtitle}>Broadcasts and alerts from administration</Text>
      </View>

      <FlatList
        style={styles.flatList}
        data={announcements}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.dateRow}>
                <Ionicons name="notifications-outline" size={14} color={Colors.blue600} />
                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </Text>
              </View>
              {isNew(item.createdAt) && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
            </View>
            <Text style={styles.message}>{item.message || item.title}</Text>
          </View>
        )}
        ListEmptyComponent={<EmptyState title="No announcements yet" subtitle="You're all caught up! Check back later for updates." />}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[Colors.emerald600]} />
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
    zIndex: 10,
  },
  flatList: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl + 20,
    gap: Spacing.sm + 2,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderLeftWidth: 4,
    borderLeftColor: Colors.blue500,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  date: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
  },
  newBadge: {
    backgroundColor: Colors.emerald50,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  newBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 14,
    fontFamily: Typography.fontFamily,
    color: Colors.slate700,
    lineHeight: 21,
  },
});
