import '@/lib/i18n';

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
import { ToastProvider } from '@/contexts/ToastContext';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { CustomAlert } from '@/components/ui/CustomAlert';
import { Toast } from '@/components/ui/Toast';
import Constants from 'expo-constants';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Colors } from '@/constants/theme';
import AnimatedSplash from '@/components/SplashScreen';
import { UpdateRequiredModal } from '@/components/UpdateRequiredModal';
import { getAppSettings } from '@/services/appSettingsService';
import { isVersionBelow } from '@/lib/version';

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
        <Stack.Screen name="appointment" />
        <Stack.Screen name="payment" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="waitlist" />
      </Stack>
    </>
  );
}

// ─── NetworkProvider bridge (reads userId from AuthContext) ───────────────────
function NetworkProviderWithAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <NetworkProvider userId={user?.id}>{children}</NetworkProvider>;
}

// ─── Forced update gate ────────────────────────────────────────────────────────
// Runs independent of auth — a stale build should be blocked before login too.
function useUpdateGate() {
  const [updateInfo, setUpdateInfo] = useState<{
    required: boolean;
    message: string | null;
    forceUpdate: boolean;
  }>({ required: false, message: null, forceUpdate: false });
  // A soft prompt can be dismissed for the rest of this app session; it
  // reappears on the next launch as long as min_app_version is still ahead.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const currentVersion = Constants.expoConfig?.version;
    if (!currentVersion) return;

    getAppSettings().then(({ data }) => {
      if (data && isVersionBelow(currentVersion, data.minAppVersion)) {
        setUpdateInfo({ required: true, message: data.updateMessage, forceUpdate: data.forceUpdate });
      }
    });
  }, []);

  return {
    visible: updateInfo.required && !(dismissed && !updateInfo.forceUpdate),
    message: updateInfo.message,
    forceUpdate: updateInfo.forceUpdate,
    dismiss: () => setDismissed(true),
  };
}

// ─── Root layout ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const updateGate = useUpdateGate();

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
          <ToastProvider>
            <AuthProvider>
              <NetworkProviderWithAuth>
                <RootNavigator />
              </NetworkProviderWithAuth>
            </AuthProvider>
            <Toast />
          </ToastProvider>
          <CustomAlert />
        </AlertProvider>

        <UpdateRequiredModal
          visible={updateGate.visible}
          message={updateGate.message}
          forceUpdate={updateGate.forceUpdate}
          onDismiss={updateGate.dismiss}
        />

        {/* Animated JS splash rendered on top of everything */}
        {showSplash && (
          <AnimatedSplash onFinished={() => setShowSplash(false)} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
