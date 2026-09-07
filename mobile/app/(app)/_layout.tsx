/**
 * Authenticated App Group Layout
 *
 * Wraps all authenticated screens.
 * Role-based routing is handled by the index screen.
 */
import { Stack } from 'expo-router';
import { Colors } from '../../src/constants/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.white },
        animation: 'none',
      }}
    />
  );
}
