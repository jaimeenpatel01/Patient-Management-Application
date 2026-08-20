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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { uploadAvatar, updateProfile, removeAvatar } from '@/services/profileService';
import { getDoctorDisplayName } from '@/lib/formatters';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, profile, signOut, refreshProfile, updatePassword } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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
      
      const oldAvatarUrl = profile?.avatar_url;

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

  const displayName = getDoctorDisplayName(profile?.full_name ?? null, user?.email);

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

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    setIsUpdatingPassword(true);
    const { error } = await updatePassword(newPassword);
    setIsUpdatingPassword(false);
    
    if (error) {
      Alert.alert('Update Failed', error);
    } else {
      Alert.alert('Success', 'Password updated successfully');
      setIsPasswordModalVisible(false);
      setNewPassword('');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
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
              Alert.alert('Error', error.message || 'Failed to delete account.');
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
            value="1.2.1"
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
            icon={<Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />}
            style={{ marginBottom: Spacing.base }}
          />
        )}
        <Button
          title="Delete Account"
          onPress={handleDeleteAccount}
          variant="danger"
          loading={isDeletingAccount}
          icon={<Ionicons name="trash-outline" size={20} color={Colors.textInverse} />}
        />
      </View>

      {/* Sign Out */}
      <View style={styles.signOutSection}>
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="secondary"
          loading={isSigningOut}
          icon={<Ionicons name="log-out-outline" size={20} color={Colors.text} />}
        />
      </View>
    </ScrollView>

    {/* Update Password Modal */}
    <Modal
      visible={isPasswordModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setIsPasswordModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Update Password</Text>
          <Text style={styles.modalSubtitle}>Enter your new password below.</Text>
          
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="New Password (min 6 chars)"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => {
                setIsPasswordModalVisible(false);
                setNewPassword('');
              }}
              disabled={isUpdatingPassword}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modalSubmitButton}
              onPress={handleUpdatePassword}
              disabled={isUpdatingPassword}
            >
              {isUpdatingPassword ? (
                <ActivityIndicator color={Colors.textInverse} size="small" />
              ) : (
                <Text style={styles.modalSubmitText}>Update</Text>
              )}
            </TouchableOpacity>
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
        <Ionicons name={icon} size={20} color={Colors.textSecondary} />
        <Text style={styles.infoLabel}>{label}{' '}</Text>
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
    alignItems:'center',
    justifyContent:'center',
    textAlign:'center',
    alignSelf:'center'
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
    maxWidth: '65%',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
    backgroundColor: Colors.background,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    color: Colors.text,
    fontSize: Typography.base,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  modalCancelButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
  },
  modalCancelText: {
    color: Colors.textSecondary,
    fontSize: Typography.base,
    fontWeight: Typography.medium,
  },
  modalSubmitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    minWidth: 100,
    alignItems: 'center',
  },
  modalSubmitText: {
    color: Colors.textInverse,
    fontSize: Typography.base,
    fontWeight: Typography.medium,
  },
});
