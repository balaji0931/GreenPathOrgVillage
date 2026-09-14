/**
 * GreenPath Village Manager — Sub-Screen Header & Layout Wrapper
 *
 * Used for all 22 tools drilled down from the "More" screen.
 * Features:
 * - Top back navigation bar with [ ← Back to More ] button
 * - Active screen title
 * - Optional custom content or rich placeholder UI
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { ManagerMoreScreenId } from '../../types/manager';

interface SubScreenContainerProps {
  screenId: ManagerMoreScreenId;
  title: string;
  category?: string;
  description?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  phaseInfo?: string;
  onBack: () => void;
  children?: React.ReactNode;
}

export function SubScreenContainer({
  screenId,
  title,
  category = 'Management Tool',
  description,
  iconName = 'cube-outline',
  iconColor = Colors.emerald700,
  iconBgColor = Colors.emerald50,
  phaseInfo = 'Ready for Screen Implementation',
  onBack,
  children,
}: SubScreenContainerProps) {
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  };

  return (
    <View style={styles.container}>
      {/* Top Sub-Screen Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          accessibilityLabel="Back to More Menu"
        >
          <Ionicons name="arrow-back" size={20} color={Colors.slate700} />
          <Text style={styles.backText}>Back to More</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>

      {/* Content Area: Custom Children or Rich Placeholder Card */}
      {children ? (
        <View style={styles.contentArea}>{children}</View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero Tool Card */}
          <View style={styles.heroCard}>
            <View style={[styles.iconBox, { backgroundColor: iconBgColor }]}>
              <Ionicons name={iconName} size={36} color={iconColor} />
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{category.toUpperCase()}</Text>
            </View>
            <Text style={styles.heroTitle}>{title}</Text>
            {description && <Text style={styles.heroDescription}>{description}</Text>}

            <View style={styles.statusPill}>
              <Ionicons name="sparkles" size={13} color={Colors.emerald700} />
              <Text style={styles.statusPillText}>{phaseInfo}</Text>
            </View>
          </View>

          {/* Quick Context Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Screen Architecture</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Tool ID:</Text>
              <Text style={styles.infoVal}>{screenId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Parent Navigation:</Text>
              <Text style={styles.infoVal}>More Tab (Grouped Hub)</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Hardware Back:</Text>
              <Text style={styles.infoVal}>Supported (Returns to More)</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
    ...Shadows.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: 4,
    paddingRight: Spacing.md,
  },
  backText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate700,
  },
  headerTitleBox: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
  },
  contentArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  heroCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
    marginBottom: Spacing.lg,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  categoryBadge: {
    backgroundColor: Colors.slate100,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate600,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  heroDescription: {
    fontSize: 13,
    fontFamily: Typography.fontFamily,
    color: Colors.slate500,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.emerald50,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.emerald100,
  },
  statusPillText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.emerald700,
  },
  infoCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  infoCardTitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
    paddingBottom: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoKey: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate500,
  },
  infoVal: {
    fontSize: 12,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate800,
  },
});
