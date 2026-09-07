/**
 * App Index — Role-Based Redirect
 *
 * After authentication, redirects to the appropriate role dashboard.
 * Mirrors the web App.tsx routing logic.
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../../src/auth/AuthProvider';
import { Colors } from '../../src/constants/theme';

const ROLE_ROUTES: Record<string, string> = {
  admin: '/(app)/admin',
  moderator: '/(app)/moderator',
  manager: '/(app)/manager',
  collector: '/(app)/collector',
  generator: '/(app)/generator',
  fieldworker: '/(app)/fieldworker',
};

export default function AppIndex() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.role) {
      const route = ROLE_ROUTES[user.role];
      if (route) {
        router.replace(route as any);
      }
    }
  }, [user]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.emerald600} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
});
