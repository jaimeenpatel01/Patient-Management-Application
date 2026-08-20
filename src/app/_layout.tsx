import React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

function RootNavigator() {
  const { session, isLoading, isFirstTimeGoogleSignIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isResetPasswordFlow = inAuthGroup && (segments[1] === 'reset-password' || segments[1] === 'forgot-password');

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup && !isResetPasswordFlow) {
      if (isFirstTimeGoogleSignIn) {
        if (segments[1] !== 'complete-profile') {
          router.replace('/(auth)/complete-profile');
        }
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [session, isLoading, segments, isFirstTimeGoogleSignIn]);

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
      </Stack>
    </>
  );
}

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['bottom', 'left', 'right']}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
