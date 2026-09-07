/**
 * Status Badge Component
 * Shows a colored badge for collection/issue status.
 */
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  collected: { bg: '#dcfce7', text: '#166534' },
  missed: { bg: '#fef2f2', text: '#991b1b' },
  open: { bg: '#fef3c7', text: '#92400e' },
  in_progress: { bg: '#dbeafe', text: '#1e40af' },
  resolved: { bg: '#dcfce7', text: '#166534' },
  present: { bg: '#dcfce7', text: '#166534' },
  half_day: { bg: '#fef3c7', text: '#92400e' },
  absent: { bg: '#fef2f2', text: '#991b1b' },
};

const STATUS_LABELS: Record<string, string> = {
  collected: 'Collected',
  missed: 'Not Collected',
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  present: 'Present',
  half_day: 'Half Day',
  absent: 'Absent',
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] || { bg: Colors.slate100, text: Colors.slate700 };
  const label = STATUS_LABELS[status] || status;

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, size === 'md' && styles.badgeMd]}>
      <Text style={[styles.text, { color: colors.text }, size === 'md' && styles.textMd]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  text: {
    fontSize: 11,
    fontFamily: Typography.fontFamilySemiBold,
    textTransform: 'capitalize',
  },
  textMd: {
    fontSize: 13,
  },
});
