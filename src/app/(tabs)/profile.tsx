import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/contexts/AlertContext';
import { getDoctorDisplayName } from '@/lib/formatters';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuth();
  const { showAlert } = useAlert();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const router = useRouter();

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

  const handleDeleteAccount = () => {
    const { supabase } = require('@/lib/supabase');
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
            }
          },
        },
      ]
    );
  };

  const isGoogleUser = user?.app_metadata?.provider === 'google';

  const accountItems: MenuItemProps[] = [
    {
      icon: 'person-outline',
      label: 'Personal Information',
      onPress: () => router.push('/profile/personal-info' as any),
    },
    ...(!isGoogleUser
      ? [
          {
            icon: 'lock-closed-outline' as keyof typeof Ionicons.glyphMap,
            label: 'Change Password',
            onPress: () => router.push('/profile/change-password' as any),
          },
        ]
      : []),
  ];

  const supportItems: MenuItemProps[] = [
    {
      icon: 'help-circle-outline',
      label: 'Help & Support',
      onPress: () => router.push('/profile/help-support' as any),
    },
    {
      icon: 'information-circle-outline',
      label: 'About PhysioDesk',
      onPress: () => router.push('/profile/about' as any),
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={Colors.primary} />
              </View>
            )}
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={[styles.menuCard, Shadows.sm]}>
            {accountItems.map((item, index) => (
              <React.Fragment key={item.label}>
                {index > 0 && <View style={styles.divider} />}
                <MenuItem {...item} />
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUPPORT</Text>
          <View style={[styles.menuCard, Shadows.sm]}>
            {supportItems.map((item, index) => (
              <React.Fragment key={item.label}>
                {index > 0 && <View style={styles.divider} />}
                <MenuItem {...item} />
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={isSigningOut}
          activeOpacity={0.7}
        >
          {isSigningOut ? (
            <ActivityIndicator size="small" color={Colors.error} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
          disabled={isDeletingAccount}
          activeOpacity={0.7}
        >
          {isDeletingAccount ? (
            <ActivityIndicator size="small" color={Colors.textTertiary} />
          ) : (
            <Text style={styles.deleteText}>Delete Account</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Menu Item ────────────────────────────────────────────────────────────────

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

function MenuItem({ icon, label, onPress }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.menuItemLeft}>
        <View style={styles.menuIconBg}>
          <Ionicons name={icon} size={20} color={Colors.primary} />
        </View>
        <Text style={styles.menuItemLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: Spacing.base,
    ...Shadows.md,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: Colors.surface,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.surface,
  },
  profileName: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  // Sections
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textTertiary,
    letterSpacing: 1.2,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  menuCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.base,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemLabel: {
    fontSize: Typography.base,
    fontWeight: Typography.medium,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: Spacing.base + 36 + Spacing.md, // Align with text after icon
  },
  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 2,
    marginTop: Spacing.lg,
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.lg,
  },
  signOutText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.error,
  },
  // Delete Account
  deleteButton: {
    alignItems: 'center',
    paddingVertical: Spacing.base,
    marginTop: Spacing.lg,
  },
  deleteText: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.textTertiary,
    textDecorationLine: 'underline',
  },
});