import React, { useRef, useEffect, useState } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider } from '@/contexts/AuthContext';
import { AlertProvider } from '@/contexts/AlertContext';
import { CustomAlert } from '@/components/ui/CustomAlert';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Colors } from '@/constants/theme';
import AnimatedSplash from '@/components/SplashScreen';

// Keep the native splash visible until we're ready to show our JS one.
SplashScreen.preventAutoHideAsync();

// ─── Root navigator ───────────────────────────────────────────────────────────
function RootNavigator() {
  const { session, profile, isLoading, isFirstTimeGoogleSignIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isResetPasswordFlow =
      inAuthGroup &&
      (segments[1] === 'reset-password' || segments[1] === 'forgot-password');

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session) {
      const isGoogleUser = session.user.app_metadata?.provider === 'google';
      const isProfileComplete = profile && profile.phone;

      if (isGoogleUser && !isProfileComplete) {
        if (segments[1] !== 'complete-profile') {
          router.replace('/(auth)/complete-profile');
        }
      } else if (inAuthGroup && !isResetPasswordFlow) {
        router.replace('/(tabs)');
      }
    }
  }, [session, profile, isLoading, segments]);

  if (isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="patient" />
        <Stack.Screen name="consultation" />
        <Stack.Screen name="attendance" />
        <Stack.Screen name="payment" />
        <Stack.Screen name="profile" />
      </Stack>
    </>
  );
}

// ─── Root layout ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  // Hide the native splash immediately — our animated JS splash takes over.
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: Colors.background }}
        edges={['bottom', 'left', 'right']}
      >
        <AlertProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
          <CustomAlert />
        </AlertProvider>

        {/* Animated JS splash rendered on top of everything */}
        {showSplash && (
          <AnimatedSplash onFinished={() => setShowSplash(false)} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
