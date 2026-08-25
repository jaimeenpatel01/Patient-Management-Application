import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/contexts/AlertContext';
import { uploadAvatar, updateProfile, removeAvatar } from '@/services/profileService';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

export default function PersonalInfoScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const nameChanged = fullName !== (profile?.full_name ?? '');
    const phoneChanged = phone !== (profile?.phone ?? '');
    setHasChanges(nameChanged || phoneChanged);
  }, [fullName, phone, profile]);

  // ─── Avatar Handlers ─────────────────────────────────────────

  const handleAvatarUpload = async () => {
    if (!user) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setIsUploading(true);
      const uri = result.assets[0].uri;
      const base64Data = result.assets[0].base64;

      if (!base64Data) {
        showAlert('Error', 'Could not read image data.');
        setIsUploading(false);
        return;
      }

      const { publicUrl, error: uploadError } = await uploadAvatar(user.id, uri, base64Data);

      if (uploadError || !publicUrl) {
        showAlert('Upload Failed', uploadError || 'Could not upload image');
        setIsUploading(false);
        return;
      }

      const { error: updateError } = await updateProfile(user.id, { avatar_url: publicUrl });

      if (updateError) {
        showAlert('Update Failed', updateError);
      } else {
        await refreshProfile();
      }
      setIsUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!user || !profile?.avatar_url) return;

    setIsUploading(true);
    const { error } = await removeAvatar(user.id, profile.avatar_url);
    if (error) {
      showAlert('Remove Failed', error);
    } else {
      await refreshProfile();
    }
    setIsUploading(false);
  };

  const handleAvatarPress = () => {
    if (!profile?.avatar_url) {
      handleAvatarUpload();
      return;
    }

    showAlert(
      'Profile Photo',
      'What would you like to do?',
      [
        { text: 'Upload New Photo', onPress: handleAvatarUpload },
        { text: 'Remove Photo', style: 'destructive', onPress: handleAvatarRemove },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ─── Save Handler ─────────────────────────────────────────────

  const handleSave = async () => {
    if (!user) return;

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      showAlert('Error', 'Name cannot be empty.');
      return;
    }

    setIsSaving(true);
    const updates: Record<string, any> = {
      full_name: trimmedName,
      phone: phone.trim() || null,
    };

    const { error } = await updateProfile(user.id, updates);
    setIsSaving(false);

    if (error) {
      showAlert('Update Failed', error);
    } else {
      await refreshProfile();
      showAlert('Success', 'Your information has been updated.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handleAvatarPress}
            disabled={isUploading}
            activeOpacity={0.7}
          >
            {isUploading ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator color={Colors.primary} size="large" />
              </View>
            ) : profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={44} color={Colors.primary} />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={16} color={Colors.textInverse} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        {/* Form */}
        <View style={[styles.formCard, Shadows.sm]}>
          <Input
            label="Full Name"
            leftIcon="person-outline"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            autoCapitalize="words"
          />
          <Input
            label="Phone Number"
            leftIcon="call-outline"
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
          />
          <Input
            label="Email"
            leftIcon="mail-outline"
            value={user?.email ?? ''}
            editable={false}
            placeholder="Email address"
            hint="Email cannot be changed"
          />
        </View>

        {/* Save Button */}
        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={isSaving}
          disabled={!hasChanges}
          style={{ marginTop: Spacing.lg }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  avatarWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    position: 'relative',
    ...Shadows.md,
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: Colors.surface,
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.surface,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: Colors.primary,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.surface,
  },
  avatarHint: {
    fontSize: Typography.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },
  // Form
  formCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    paddingTop: Spacing.lg,
  },
});
