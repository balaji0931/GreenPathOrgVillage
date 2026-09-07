/**
 * Empty State Component
 * Shows an icon and message when a list is empty.
 */
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.xxl,
  },
  title: {
    fontSize: 16,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.slate500,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily,
    color: Colors.slate400,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
