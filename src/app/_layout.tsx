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
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Colors } from '@/constants/theme';
import DevSplashScreen from '@/components/DevSplashScreen';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  🔧 DEV SPLASH MODE                                                        ║
// ║  Set to `true` to show ONLY the splash screen design with fast refresh.     ║
// ║  Set to `false` to restore normal app behavior.                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
const DEV_SPLASH_MODE = true;

// Keep the native splash visible until we're ready to show our JS one.
SplashScreen.preventAutoHideAsync();

// ─── Full-screen JS splash overlay ───────────────────────────────────────────
function JsSplash({ onDone }: { onDone: () => void }) {
  const opacity = useRef(new Animated.Value(1)).current;

  const hide = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(onDone);
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity, zIndex: 999 }]}>
      <Image
        source={require('@/assets/images/splash-icon.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        onLoad={hide}          // fade out as soon as the image finishes rendering
        fadeDuration={0}
      />
    </Animated.View>
  );
}

// ─── Root navigator ───────────────────────────────────────────────────────────
function RootNavigator() {
  const { session, isLoading, isFirstTimeGoogleSignIn } = useAuth();
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

// ─── Root layout ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  const [showJsSplash, setShowJsSplash] = useState(true);

  // Hide the native splash immediately — our JS splash takes over from here.
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // ── Dev mode: show only the splash design for fast iteration ────────────
  if (DEV_SPLASH_MODE) {
    return (
      <>
        <StatusBar style="dark" />
        <DevSplashScreen />
      </>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: Colors.background }}
        edges={['bottom', 'left', 'right']}
      >
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>

        {/* Full-screen JS splash rendered on top of everything */}
        {showJsSplash && (
          <JsSplash onDone={() => setShowJsSplash(false)} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
