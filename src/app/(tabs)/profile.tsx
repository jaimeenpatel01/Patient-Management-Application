import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadAvatar, updateProfile, removeAvatar } from '@/services/profileService';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
        Alert.alert('Error', 'Could not read image data.');
        setIsUploading(false);
        return;
      }
      
      const { publicUrl, error: uploadError } = await uploadAvatar(user.id, uri, base64Data);
      
      if (uploadError || !publicUrl) {
        Alert.alert('Upload Failed', uploadError || 'Could not upload image');
        setIsUploading(false);
        return;
      }

      const { error: updateError } = await updateProfile(user.id, { avatar_url: publicUrl });
      
      if (updateError) {
        Alert.alert('Update Failed', updateError);
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
      Alert.alert('Remove Failed', error);
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

    Alert.alert(
      'Profile Photo',
      'What would you like to do?',
      [
        { text: 'Upload New Photo', onPress: handleAvatarUpload },
        { text: 'Remove Photo', style: 'destructive', onPress: handleAvatarRemove },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  let displayName = profile?.full_name || user?.email?.split('@')[0] || 'Doctor';
  const isDoctor = profile?.role === 'doctor' || !profile;
  if (isDoctor) {
    const lowerName = displayName.toLowerCase();
    if (!lowerName.startsWith('dr.') && !lowerName.startsWith('dr ')) {
      displayName = `Dr. ${displayName}`;
    }
  }

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsSigningOut(true);
            await signOut();
            setIsSigningOut(false);
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Card */}
      <View style={[styles.profileCard, Shadows.sm]}>
        <TouchableOpacity style={styles.avatarLarge} onPress={handleAvatarPress} disabled={isUploading}>
          {isUploading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={40} color={Colors.primary} />
          )}
          <View style={styles.editBadge}>
            <Ionicons name="pencil" size={14} color={Colors.textInverse} />
          </View>
        </TouchableOpacity>
        <Text style={styles.profileName}>
          {displayName}
        </Text>
        <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>Doctor</Text>
        </View>
      </View>

      {/* Account Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={[styles.infoCard, Shadows.sm]}>
          <InfoRow
            icon="mail-outline"
            label="Email"
            value={user?.email ?? 'N/A'}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="shield-checkmark-outline"
            label="Role"
            value="Doctor"
          />
          <View style={styles.divider} />
          <InfoRow
            icon="time-outline"
            label="Member Since"
            value={user?.created_at
              ? new Date(user.created_at).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : 'N/A'
            }
          />
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        <View style={[styles.infoCard, Shadows.sm]}>
          <InfoRow
            icon="information-circle-outline"
            label="Version"
            value="1.1.0"
          />
        </View>
      </View>

      {/* Sign Out */}
      <View style={styles.signOutSection}>
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="danger"
          loading={isSigningOut}
          icon={<Ionicons name="log-out-outline" size={20} color={Colors.textInverse} />}
        />
      </View>
    </ScrollView>
  );
}

interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowLeft}>
        <Ionicons name={icon} size={20} color={Colors.textSecondary} />
        <Text style={styles.infoLabel}>{label}{' '}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
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
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
    position: 'relative',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  profileName: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.text,
  },
  profileEmail: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  roleBadge: {
    backgroundColor: Colors.primaryFaded,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.md,
  },
  roleBadgeText: {
    fontSize: Typography.xs,
    fontWeight: Typography.medium,
    color: Colors.primary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  infoLabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.text,
    maxWidth: '50%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.base,
  },
  signOutSection: {
    marginTop: Spacing.sm,
  },
});
