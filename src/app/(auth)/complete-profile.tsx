import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAlert } from '@/contexts/AlertContext';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile, uploadAvatar } from '@/services/profileService';

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { user, profile, setIsFirstTimeGoogleSignIn, refreshProfile } = useAuth();
  const { showAlert } = useAlert();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url || user?.user_metadata?.avatar_url || null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // If the profile loads and we have a name, set it.
  useEffect(() => {
    if (profile?.full_name && !fullName) {
      setFullName(profile.full_name);
    }
    if (profile?.phone && !phone) {
      setPhone(profile.phone);
    }
    if (profile?.avatar_url && !avatarUri && !avatarBase64) {
      setAvatarUri(profile.avatar_url);
    }
  }, [profile, avatarBase64, avatarUri, fullName, phone]);

  const handleAvatarUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      const base64Data = result.assets[0].base64;

      if (!base64Data) {
        showAlert('Error', 'Could not read image data.');
        return;
      }

      setAvatarUri(uri);
      setAvatarBase64(base64Data);
    }
  };

  const handleCompleteProfile = async () => {
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }

    if (!user) {
      setError('User not found.');
      return;
    }

    setIsLoading(true);

    try {
      let publicUrl = profile?.avatar_url || null;

      // If they selected a new image, upload it
      if (avatarBase64 && avatarUri && avatarUri !== profile?.avatar_url) {
        setIsUploadingImage(true);
        const { publicUrl: newUrl, error: uploadError } = await uploadAvatar(user.id, avatarUri, avatarBase64);
        setIsUploadingImage(false);

        if (uploadError || !newUrl) {
          setError(uploadError || 'Could not upload image');
          showToast(uploadError || 'Could not upload image', 'error');
          setIsLoading(false);
          return;
        }
        publicUrl = newUrl;
      }

      // Update the profile with new name, phone, and avatar
      const { error: updateError } = await updateProfile(user.id, {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        avatar_url: publicUrl,
      });

      if (updateError) {
        setError(updateError);
        showToast(updateError, 'error');
        setIsLoading(false);
        return;
      }

      // Refresh profile context
      await refreshProfile();

      // Clear flag to allow navigation to tabs
      setIsFirstTimeGoogleSignIn(false);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      showToast(err.message || 'An unexpected error occurred.', 'error');
    } finally {
      setIsLoading(false);
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
        <View style={styles.branding}>
          <Text style={styles.appName}>Complete Profile</Text>
          <Text style={styles.appTagline}>Let&apos;s set up your clinic details</Text>
        </View>

        <View style={styles.formCard}>
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Avatar Upload Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={[styles.avatarContainer, Shadows.sm]}
              onPress={handleAvatarUpload}
              activeOpacity={0.8}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={40} color={Colors.primary} />
              )}
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={14} color={Colors.textInverse} />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Tap to choose a photo</Text>
          </View>

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
            label="Phone Number"
            placeholder="9876543210"
            leftIcon="call-outline"
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={(text) => {
              setPhone(text.replace(/[^0-9]/g, '').slice(0, 10));
              if (error) setError('');
            }}
          />

          <View style={styles.legalContainer}>
            <Text style={styles.legalText}>
              By continuing, you agree to our{' '}
              <Text style={styles.legalLink} onPress={() => Linking.openURL('https://jaimeenpatel01.github.io/Patient-Management-Application/terms/')}>
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text style={styles.legalLink} onPress={() => Linking.openURL('https://jaimeenpatel01.github.io/Patient-Management-Application/privacy/')}>
                Privacy Policy
              </Text>
            </Text>
          </View>

          <Button
            title="Continue"
            onPress={handleCompleteProfile}
            loading={isLoading || isUploadingImage}
            size="lg"
            style={styles.submitButton}
          />
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
    justifyContent: 'center',
  },
  branding: {
    marginBottom: Spacing['2xl'],
    alignItems: 'center',
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  avatarHint: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  submitButton: {
    marginTop: Spacing.xl,
  },
  legalContainer: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  legalText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    color: Colors.primary,
    fontWeight: Typography.medium,
  },
});
