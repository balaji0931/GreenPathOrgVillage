/**
 * GreenPath Village Manager — Tab 2: Focused Search View
 *
 * Full-screen overlay search mode matching web dashboard:
 * - Back button with haptic exit
 * - Real-time filtering across head name, house #, and UID
 * - Clear text button
 * - Renders CollectionsHouseholdRow or clean empty state
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius } from '../../../constants/theme';
import { CollectionsHouseholdRow } from './CollectionsHouseholdRow';
import type { ManagerCollectionHousehold } from '../../../types/manager';

interface CollectionsSearchViewProps {
  households: ManagerCollectionHousehold[];
  onSelect: (household: ManagerCollectionHousehold) => void;
  onBack: () => void;
}

export function CollectionsSearchView({
  households,
  onSelect,
  onBack,
}: CollectionsSearchViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHouseholds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return households;
    return households.filter((h) => {
      const nameMatch = (h.headName || '').toLowerCase().includes(q);
      const houseMatch = (h.houseNumber || '').toLowerCase().includes(q);
      const uidMatch = (h.uid || '').toLowerCase().includes(q);
      return nameMatch || houseMatch || uidMatch;
    });
  }, [households, searchQuery]);

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchQuery('');
  };

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  }, [onBack]);

  useEffect(() => {
    const handleHardwareBack = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => sub.remove();
  }, [handleBack]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Search Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.slate800} />
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <Ionicons name="search" size={18} color={Colors.slate400} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name, house # or UID..."
              placeholderTextColor={Colors.slate400}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
              clearButtonMode="never"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={Colors.slate400} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Results List */}
        <FlatList
          data={filteredHouseholds}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <CollectionsHouseholdRow
              household={item}
              onSelect={onSelect}
              highlightQuery={searchQuery}
            />
          )}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            filteredHouseholds.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="search-outline" size={32} color={Colors.slate400} />
              </View>
              <Text style={styles.emptyTitle}>No matching members found</Text>
              <Text style={styles.emptySubtitle}>
                Try searching by a different name, house number, or UID
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    height: 42,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate900,
    height: '100%',
  },
  listContent: {
    paddingBottom: Spacing.xxl,
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate700,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
    textAlign: 'center',
    maxWidth: 240,
  },
});
