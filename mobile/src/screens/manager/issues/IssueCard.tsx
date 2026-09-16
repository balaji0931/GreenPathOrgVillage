/**
 * GreenPath Village Manager Mobile — issue Issue Card
 *
 * Card Component for Citizen issue Feed:
 * - Status color accent strip (Red open, Amber in-progress, Green resolved)
 * - Badges: Status, Category, and relative time
 * - Citizen evidence photo thumbnail with tap to inspect
 * - Reporter UID
 * - Manager reply section with resolution proof photo thumbnail
 * - Edit / Manage button
 */
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../constants/theme';
import { ExpandableText } from '../../../components/common/ExpandableText';
import type { ManagerIssue } from '../../../types/manager';

interface IssueCardProps {
  issue: ManagerIssue;
  onManage: (issue: ManagerIssue) => void;
  onViewPhoto: (photoUrl: string, title: string, subtitle: string) => void;
}

export function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function formatCategoryLabel(cat?: string | null): string {
  if (!cat) return 'issue';
  return cat
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function IssueCard({ issue, onManage, onViewPhoto }: IssueCardProps) {
  const isResolved = issue.status === 'resolved';
  const isInProgress = issue.status === 'in_progress';

  const statusStripColor = isResolved
    ? '#10b981'
    : isInProgress
    ? '#f59e0b'
    : '#ef4444';

  const statusBadgeStyle = isResolved
    ? styles.statusBadgeResolved
    : isInProgress
    ? styles.statusBadgeInProgress
    : styles.statusBadgeOpen;

  const statusTextStyle = isResolved
    ? styles.statusTextResolved
    : isInProgress
    ? styles.statusTextInProgress
    : styles.statusTextOpen;

  const statusLabel = isResolved
    ? 'Resolved'
    : isInProgress
    ? 'In Progress'
    : 'Open';

  const timeAgo = formatRelativeTime(issue.createdAt);
  const categoryLabel = formatCategoryLabel(issue.category);

  return (
    <View style={styles.card}>
      {/* Left Status Color Accent Strip */}
      <View style={[styles.statusStrip, { backgroundColor: statusStripColor }]} />

      <View style={styles.cardContent}>
        {/* Top Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <Text style={styles.issueTitle} numberOfLines={2}>
              {issue.title}
            </Text>

            <View style={styles.metaRow}>
              {/* Status Pill */}
              <View style={[styles.statusBadge, statusBadgeStyle]}>
                <View style={[styles.statusDot, { backgroundColor: statusStripColor }]} />
                <Text style={[styles.statusText, statusTextStyle]}>{statusLabel}</Text>
              </View>

              {/* Category Pill */}
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText} numberOfLines={1}>
                  {categoryLabel}
                </Text>
              </View>

              {/* Time Ago */}
              {timeAgo ? <Text style={styles.timeText}>{timeAgo}</Text> : null}
            </View>
          </View>

          {/* Edit / Manage Action Button */}
          <TouchableOpacity
            style={styles.manageBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onManage(issue);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={17} color={Colors.slate600} />
          </TouchableOpacity>
        </View>

        {/* Description with '...Read more' / 'Show less' toggle */}
        {issue.description ? (
          <ExpandableText
            text={issue.description}
            numberOfLines={2}
            charLimit={90}
            style={styles.descriptionText}
            readMoreColor={Colors.emerald700}
          />
        ) : null}

        {/* Citizen Evidence Photo & Reporter Row */}
        <View style={styles.evidenceRow}>
          {issue.photoUrl ? (
            <TouchableOpacity
              style={styles.photoThumbWrap}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onViewPhoto(issue.photoUrl!, 'Citizen Evidence', issue.title);
              }}
              activeOpacity={0.8}
            >
              <Image source={{ uri: issue.photoUrl }} style={styles.photoThumb} />
              <View style={styles.photoBadge}>
                <Ionicons name="camera" size={10} color={Colors.white} />
              </View>
            </TouchableOpacity>
          ) : null}

          <View style={styles.reporterInfo}>
            <Ionicons name="person-outline" size={12} color={Colors.slate400} />
            <Text style={styles.reporterText} numberOfLines={1}>
              by {issue.reportedBy || 'Resident'}
            </Text>
          </View>
        </View>

        {/* Manager Reply Section with '...Read more' / 'Show less' toggle */}
        {issue.managerReply ? (
          <View style={styles.replyBox}>
            <View style={styles.replyHeader}>
              <View style={styles.replyIndicator} />
              <Text style={styles.replyHeaderTitle}>Manager Reply</Text>
            </View>

            <ExpandableText
              text={issue.managerReply}
              numberOfLines={2}
              charLimit={90}
              style={styles.replyBodyText}
              readMoreColor={Colors.emerald700}
            />

            {issue.managerProofPhotoUrl ? (
              <TouchableOpacity
                style={styles.proofThumbWrap}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onViewPhoto(
                    issue.managerProofPhotoUrl!,
                    'Resolution Proof',
                    issue.title
                  );
                }}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: issue.managerProofPhotoUrl }}
                  style={styles.proofThumb}
                />
                <View style={styles.proofBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={Colors.emerald700} />
                  <Text style={styles.proofBadgeText}>Proof</Text>
                </View>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.sm,
  },
  statusStrip: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  titleGroup: {
    flex: 1,
  },
  issueTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.slate900,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusBadgeOpen: {
    backgroundColor: '#fef2f2',
  },
  statusTextOpen: {
    color: '#b91c1c',
  },
  statusBadgeInProgress: {
    backgroundColor: '#fffbeb',
  },
  statusTextInProgress: {
    color: '#b45309',
  },
  statusBadgeResolved: {
    backgroundColor: '#ecfdf5',
  },
  statusTextResolved: {
    color: '#047857',
  },
  categoryBadge: {
    backgroundColor: Colors.slate100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate600,
  },
  timeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
  },
  manageBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.slate50,
    borderWidth: 1,
    borderColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    color: Colors.slate600,
    lineHeight: 17,
  },
  evidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  photoThumbWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.slate100,
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  photoBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reporterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  reporterText: {
    fontSize: 11,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.slate400,
  },
  replyBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#dcfce7',
    padding: Spacing.sm + 2,
    gap: Spacing.xs,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  replyIndicator: {
    width: 3,
    height: 12,
    borderRadius: 1.5,
    backgroundColor: Colors.emerald700,
  },
  replyHeaderTitle: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  replyBodyText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    color: '#166534',
    lineHeight: 16,
  },
  proofThumbWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  proofThumb: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  proofBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.white,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  proofBadgeText: {
    fontSize: 10,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.emerald700,
  },
});
