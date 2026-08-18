import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function ForgotPasswordScreen() {
  const { resetPassword, verifyRecoveryOtp } = useAuth();

  // Step 1: email entry, Step 2: OTP verification
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // OTP state
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [resendTimer, setResendTimer] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  // ── Step 1: send OTP email ──────────────────────────────────
  const handleSendCode = async () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    const result = await resetPassword(email.trim());
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setStep(2);
      setResendTimer(RESEND_COOLDOWN);
    }
  };

  // ── Step 2: verify OTP ──────────────────────────────────────
  const handleOtpChange = useCallback(
    (text: string, index: number) => {
      // Only accept digits
      const digit = text.replace(/[^0-9]/g, '');

      const newOtp = [...otp];
      newOtp[index] = digit.slice(-1); // take last char in case of paste
      setOtp(newOtp);
      if (error) setError('');

      // Auto-advance to next input
      if (digit && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [otp, error],
  );

  const handleOtpKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === 'Backspace' && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
      }
    },
    [otp],
  );

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setError('');
    setIsLoading(true);
    const result = await verifyRecoveryOtp(email.trim(), code);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      // OTP verified — user now has a session; navigate to set new password
      router.replace('/(auth)/reset-password');
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError('');
    setOtp(Array(OTP_LENGTH).fill(''));
    setIsLoading(true);
    const result = await resetPassword(email.trim());
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setResendTimer(RESEND_COOLDOWN);
    }
  };

  // ── Render ──────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={50}
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (step === 2 ? setStep(1) : router.back())}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        {step === 1 ? (
          <>
            {/* ── STEP 1 ── */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="key-outline" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we&apos;ll send you a 6-digit code
                to reset your password.
              </Text>
            </View>

            <View style={styles.formCard}>
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={18} color={Colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Input
                label="Email Address"
                placeholder="doctor@clinic.com"
                leftIcon="mail-outline"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError('');
                }}
                onSubmitEditing={handleSendCode}
                returnKeyType="go"
              />

              <Button
                title="Send Code"
                onPress={handleSendCode}
                loading={isLoading}
                size="lg"
              />
            </View>
          </>
        ) : (
          <>
            {/* ── STEP 2 ── */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={32}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.title}>Enter Verification Code</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to{'\n'}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>
            </View>

            <View style={styles.formCard}>
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={18} color={Colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* OTP boxes */}
              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(ref) => {
                      inputRefs.current[i] = ref;
                    }}
                    style={[
                      styles.otpBox,
                      digit ? styles.otpBoxFilled : null,
                    ]}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, i)}
                    onKeyPress={({ nativeEvent }) =>
                      handleOtpKeyPress(nativeEvent.key, i)
                    }
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    textContentType="oneTimeCode"
                  />
                ))}
              </View>

              <Button
                title="Verify Code"
                onPress={handleVerifyOtp}
                loading={isLoading}
                size="lg"
              />

              {/* Resend */}
              <TouchableOpacity
                style={styles.resendContainer}
                onPress={handleResend}
                disabled={resendTimer > 0}
              >
                <Text
                  style={[
                    styles.resendText,
                    resendTimer > 0 && styles.resendTextDisabled,
                  ]}
                >
                  {resendTimer > 0
                    ? `Resend code in ${resendTimer}s`
                    : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['4xl'],
    paddingBottom: Spacing['3xl'],
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  header: {
    marginBottom: Spacing['2xl'],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  title: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    lineHeight: Typography.base * Typography.normal,
  },
  emailHighlight: {
    fontWeight: Typography.semibold,
    color: Colors.text,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
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
  // ── OTP inputs ───────────────────────────────────────────
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    textAlign: 'center',
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.text,
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaded,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  resendText: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.primary,
  },
  resendTextDisabled: {
    color: Colors.textTertiary,
  },
});
