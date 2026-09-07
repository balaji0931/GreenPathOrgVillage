/**
 * Root Layout — GreenPath Mobile
 *
 * Loads Inter font, wraps app in AuthProvider,
 * and routes to (auth) or (app) group based on auth state.
 */
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../src/auth/AuthProvider';

import { View } from 'react-native';
import { Colors } from '../src/constants/theme';

const ROLE_ROUTES: Record<string, string> = {
  admin: '/(app)/admin',
  moderator: '/(app)/moderator',
  manager: '/(app)/manager',
  collector: '/(app)/collector',
  generator: '/(app)/generator',
  fieldworker: '/(app)/fieldworker',
};

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Not authenticated → go to login
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Authenticated → directly open user's role dashboard (no intermediate redirect or black flash!)
      const target = (user.role && ROLE_ROUTES[user.role]) || '/(app)';
      router.replace(target as any);
    }

    // Dismiss native splash screen immediately when ready
    SplashScreen.hideAsync().catch(() => {});
  }, [user, isLoading, segments, fontsLoaded]);

  if (isLoading || !fontsLoaded) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.white }}>
      <Slot />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: Colors.white }}>
        <RootNavigator fontsLoaded={fontsLoaded} />
      </View>
    </AuthProvider>
  );
}
