/**
 * Network Status Banner
 * Red banner when offline, matching web collector-dashboard.tsx offline banner.
 */
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { useNetwork } from '../../hooks/useNetwork';

export function NetworkBanner() {
  const { isConnected } = useNetwork();

  if (isConnected) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>You are offline. Data may not be up to date.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.destructive,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  text: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    textAlign: 'center',
  },
});
