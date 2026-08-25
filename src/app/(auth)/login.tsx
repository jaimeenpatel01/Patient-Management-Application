import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** Decorative "+" cross element */
function CrossMark({ style }: { style?: object }) {
  return (
    <View style={[styles.cross, style]} pointerEvents="none">
      <View style={styles.crossH} />
      <View style={styles.crossV} />
    </View>
  );
}

export default function LoginScreen() {
  const { signIn, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return false;
    }

    if (!password) {
      setError('Please enter your password.');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    setError('');
    if (!validateForm()) return;
    setIsLoading(true);
    const result = await signIn(email.trim(), password);
    setIsLoading(false);
    if (result.error) setError(result.error);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    const result = await signInWithGoogle();
    setIsGoogleLoading(false);
    if (result.error) setError(result.error);
  };

  return (
    <View style={styles.container}>
      {/* ── Background decoration ── */}

      {/* Bottom teal wave blob — outer ring */}
      <View style={styles.waveOuter} pointerEvents="none">
        <View style={styles.waveInner} />
      </View>

      {/* Scattered "+" cross marks */}
      <CrossMark style={{ top: SCREEN_HEIGHT * 0.08,  left: SCREEN_WIDTH * 0.08 }} />
      <CrossMark style={{ top: SCREEN_HEIGHT * 0.14,  right: SCREEN_WIDTH * 0.1 }} />
      <CrossMark style={{ top: SCREEN_HEIGHT * 0.55,  left: SCREEN_WIDTH * 0.06 }} />
      <CrossMark style={{ top: SCREEN_HEIGHT * 0.62,  right: SCREEN_WIDTH * 0.07 }} />
      <CrossMark style={{ bottom: SCREEN_HEIGHT * 0.22, left: SCREEN_WIDTH * 0.14 }} />
      <CrossMark style={{ bottom: SCREEN_HEIGHT * 0.18, right: SCREEN_WIDTH * 0.12 }} />

      {/* ── Scrollable content ── */}
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={50}
      >
        {/* Branding */}
        <View style={styles.branding}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.appIcon}
          />
          <Text style={styles.appName}>PhysioDesk</Text>
          <Text style={styles.appTagline}>Manage your clinic efficiently</Text>
        </View>

        {/* Login Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Sign In</Text>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {showEmailForm ? (
            <>
              <Input
                label="Email"
                placeholder="doctor@clinic.com"
                leftIcon="mail-outline"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError('');
                }}
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                leftIcon="lock-closed-outline"
                secureTextEntry
                autoComplete="password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError('');
                }}
                onSubmitEditing={handleLogin}
                returnKeyType="go"
              />

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={isLoading}
                size="lg"
              />

              <TouchableOpacity
                style={styles.forgotButton}
                onPress={() => router.push('/(auth)/forgot-password')}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.emailOptionButton}
              onPress={() => setShowEmailForm(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="mail" size={24} color={Colors.text} />
              <Text style={styles.emailOptionText}>Email and Password</Text>
            </TouchableOpacity>
          )}

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={[styles.googleButton, isGoogleLoading && styles.googleButtonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            activeOpacity={0.7}
          >
            {isGoogleLoading ? (
              <Text style={styles.googleButtonText}>Signing in...</Text>
            ) : (
              <>
                <Image
                  source={require('@/assets/images/google-icon.png')}
                  style={styles.googleIconImage}
                  resizeMode="contain"
                />
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register' as any)}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['3xl'],
  },

  // ── Background decoration ──────────────────────────────────
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  waveOuter: {
    position: 'absolute',
    bottom: -SCREEN_HEIGHT * 0.29,
    left: -SCREEN_WIDTH * 0.25,
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_HEIGHT * 0.42,
    borderRadius: SCREEN_WIDTH * 0.75,
    backgroundColor: 'rgba(21,159,143,0.18)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  waveInner: {
    width: SCREEN_WIDTH * 1.3,
    height: SCREEN_HEIGHT * 0.36,
    borderRadius: SCREEN_WIDTH * 0.65,
    backgroundColor: 'rgba(21,159,143,0.32)',
    marginBottom: -SCREEN_HEIGHT * 0.02,
  },
  cross: {
    position: 'absolute',
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crossH: {
    position: 'absolute',
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(21,159,143,0.55)',
  },
  crossV: {
    position: 'absolute',
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: 'rgba(21,159,143,0.55)',
  },

  // ── Branding ───────────────────────────────────────────────
  branding: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.base,
  },
  appName: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.text,
  },
  appTagline: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },

  // ── Form card ─────────────────────────────────────────────
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  errorText: {
    fontSize: Typography.sm,
    color: Colors.error,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  forgotText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: Typography.medium,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    marginHorizontal: Spacing.md,
    fontWeight: Typography.medium,
  },
  emailOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  emailOptionText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleIconImage: {
    width: 24,
    height: 24,
  },
  googleButtonText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  signupText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  signupLink: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: Typography.bold,
  },
});
