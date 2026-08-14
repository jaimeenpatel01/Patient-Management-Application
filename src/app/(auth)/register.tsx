import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

export default function RegisterScreen() {
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return false;
    }

    if (!email.trim()) {
      setError('Please enter your email address.');
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return false;
    }

    if (!password) {
      setError('Please enter a password.');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    setError('');

    if (!validateForm()) return;

    setIsLoading(true);
    const result = await signUp(email.trim(), password, fullName.trim());
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      // Registration usually auto-signs in, but just in case, we'll let AuthContext handle state
      // or show a message if email confirmation is required.
      // For now, we assume successful signup logs them in or requires them to check email.
    }
  };

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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        {/* Branding */}
        <View style={styles.branding}>
          <Text style={styles.appName}>Create Account</Text>
          <Text style={styles.appTagline}>Join Doctor Management today</Text>
        </View>

        {/* Register Form */}
        <View style={styles.formCard}>
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Full Name"
            placeholder="Dr. John Doe"
            leftIcon="person-outline"
            autoComplete="name"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              if (error) setError('');
            }}
          />

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
            placeholder="Create a password"
            leftIcon="lock-closed-outline"
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError('');
            }}
          />

          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            leftIcon="lock-closed-outline"
            secureTextEntry
            autoComplete="new-password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (error) setError('');
            }}
            onSubmitEditing={handleRegister}
            returnKeyType="go"
          />

          <Button
            title="Sign Up"
            onPress={handleRegister}
            loading={isLoading}
            size="lg"
            style={styles.registerButton}
          />

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.loginLink}>Sign In</Text>
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
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing['3xl'],
  },
  backButton: {
    marginBottom: Spacing.xl,
    marginTop: Spacing.xl,
  },
  branding: {
    marginBottom: Spacing['2xl'],
  },
  appName: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.bold,
    color: Colors.text,
  },
  appTagline: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
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
  registerButton: {
    marginTop: Spacing.md,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  loginText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: Typography.bold,
  },
});
