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
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { uploadAvatar, updateProfile, removeAvatar } from '@/services/profileService';
import { getDoctorDisplayName } from '@/lib/formatters';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/contexts/AlertContext';
import { Button } from '@/components/ui/Button';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { APP_VERSION } from '@/constants/options';

export default function ProfileScreen() {
  const { user, profile, signOut, refreshProfile, updatePassword } = useAuth();
  const { showAlert } = useAlert();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const passwordInputRef = useRef<TextInput>(null);

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
      
      const oldAvatarUrl = profile?.avatar_url;

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

  const displayName = getDoctorDisplayName(profile?.full_name ?? null, user?.email);

  const handleSignOut = () => {
    showAlert(
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

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showAlert('Error', 'Password must be at least 6 characters.');
      return;
    }
    setIsUpdatingPassword(true);
    const { error } = await updatePassword(newPassword);
    setIsUpdatingPassword(false);
    
    if (error) {
      showAlert('Update Failed', error);
    } else {
      showAlert('Success', 'Password updated successfully');
      setIsPasswordModalVisible(false);
      setNewPassword('');
    }
  };

  const handleDeleteAccount = () => {
    showAlert(
      'Delete Account',
      'Are you absolutely sure you want to delete your account? This action cannot be undone and will permanently delete all your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingAccount(true);
            const { error } = await supabase.rpc('delete_user');
            if (error) {
              showAlert('Error', error.message || 'Failed to delete account.');
              setIsDeletingAccount(false);
            } else {
              await signOut();
              // No need to setIsDeletingAccount(false) as we are navigating away
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
      {/* Profile Card */}
      <View style={[styles.profileCard, Shadows.lg]}>
        <View style={styles.profileHeaderBg} />
        <TouchableOpacity style={styles.avatarLarge} onPress={handleAvatarPress} disabled={isUploading}>
          {isUploading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={40} color={Colors.primary} />
          )}
          <View style={styles.editBadge}>
            <Ionicons name="camera" size={14} color={Colors.textInverse} />
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
        <Text style={styles.sectionTitle}>Account Details</Text>
        <View style={[styles.infoCard, Shadows.sm]}>
          <InfoRow
            icon="mail"
            label="Email"
            value={user?.email ?? 'N/A'}
          />
          <View style={styles.divider} />
          <InfoRow
            icon="shield-checkmark"
            label="Role"
            value="Doctor"
          />
          <View style={styles.divider} />
          <InfoRow
            icon="calendar"
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
            icon="information-circle"
            label="Version"
            value={APP_VERSION}
          />
        </View>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Actions</Text>
        {user?.app_metadata?.provider !== 'google' && (
          <Button
            title="Update Password"
            onPress={() => setIsPasswordModalVisible(true)}
            variant="outline"
            icon={<Ionicons name="lock-closed" size={20} color={Colors.primary} />}
            style={{ marginBottom: Spacing.base }}
          />
        )}
        <Button
          title="Delete Account"
          onPress={handleDeleteAccount}
          variant="danger"
          loading={isDeletingAccount}
          icon={<Ionicons name="trash" size={20} color={Colors.textInverse} />}
        />
      </View>

      {/* Sign Out */}
      <View style={styles.signOutSection}>
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="secondary"
          loading={isSigningOut}
          icon={<Ionicons name="log-out" size={20} color={Colors.primary} />}
        />
      </View>
    </ScrollView>

    {/* Update Password Modal */}
    <Modal
      visible={isPasswordModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setIsPasswordModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>
          
          <Text style={styles.modalTitle}>Update Password</Text>
          <Text style={styles.modalSubtitle}>Enter your new password below.</Text>
          
          <TouchableOpacity 
            style={styles.inputContainer} 
            activeOpacity={0.8}
            onPress={() => passwordInputRef.current?.focus()}
          >
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              ref={passwordInputRef}
              style={styles.input}
              placeholder="New Password (min 6 chars)"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholderTextColor={Colors.textTertiary}
            />
          </TouchableOpacity>

          <View style={styles.modalActions}>
            <Button 
              title="Cancel"
              variant="ghost" 
              fullWidth={false}
              onPress={() => {
                setIsPasswordModalVisible(false);
                setNewPassword('');
              }}
              disabled={isUpdatingPassword}
            />
            <Button 
              title="Update"
              fullWidth={false}
              onPress={handleUpdatePassword}
              loading={isUpdatingPassword}
              disabled={newPassword.length < 6}
            />
          </View>
        </View>
      </View>
    </Modal>
  </View>
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
        <View style={styles.infoIconBg}>
          <Ionicons name={icon} size={18} color={Colors.primary} />
        </View>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
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
    paddingTop: Spacing.md,
  },
  profileCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    paddingTop: Spacing['3xl'],
    alignItems: 'center',
    borderWidth: 0,
    marginBottom: Spacing['2xl'],
    position: 'relative',
    overflow: 'hidden',
  },
  profileHeaderBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: Colors.primaryFaded,
  },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
    position: 'relative',
    borderWidth: 4,
    borderColor: Colors.surface,
    ...Shadows.md,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
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
    borderWidth: 3,
    borderColor: Colors.surface,
  },
  profileName: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.text,
  },
  profileEmail: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  roleBadge: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    marginTop: Spacing.lg,
  },
  roleBadgeText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  infoCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    borderWidth: 0,
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
  infoIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: Typography.base,
    color: Colors.text,
    fontWeight: Typography.medium,
  },
  infoValue: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    paddingHorizontal: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? Spacing['4xl'] : Spacing.xl,
    paddingTop: Spacing.md,
    ...Shadows.xl,
  },
  dragHandleContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.disabled,
  },
  modalTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.surfaceSecondary,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 52,
    color: Colors.text,
    fontSize: Typography.base,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
});
