import React, { createContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, ensureGoogleSigninConfigured } from '@/lib/supabase';
import { updateProfile } from '@/services/profileService';
import type { AuthContextType, Profile } from '@/types';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!error && data) {
      setProfile(data);
    } else {
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    // Get the initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        await fetchProfile(initialSession.user.id);
      }
      setIsLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh, password recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }

      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      // Lazily configure and load Google Sign-In (avoids crash in Expo Go)
      if (!ensureGoogleSigninConfigured()) {
        return {
          error: 'Google Sign-In requires a development build. It is not available in Expo Go.',
        };
      }

      const { GoogleSignin } = require('@react-native-google-signin/google-signin');

      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices();

      // Sign out from any previous Google session so the account picker
      // is always shown instead of auto-selecting the last account
      try {
        await GoogleSignin.signOut();
      } catch {
        // Ignore – signOut may throw if no previous session exists
      }

      // Sign in with Google and get the idToken
      const signInResult = await GoogleSignin.signIn();

      const idToken = signInResult.data?.idToken;
      if (!idToken) {
        return { error: 'Failed to get Google ID token. Please try again.' };
      }

      // Use the idToken to sign in with Supabase
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        return { error: error.message };
      }

      // On first-time sign-in: set Google profile photo as avatar if profile has none.
      // The DB trigger creates the profile row, but may not always populate avatar_url
      // from Google metadata. We handle it here as a reliable fallback.
      if (data.user) {
        // Small delay to allow the DB trigger to create the profile row
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: profileData } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', data.user.id)
          .single();

        // Only set avatar on first sign-in (avatar_url is null = never set before)
        if (profileData && !profileData.avatar_url) {
          const googlePhotoUrl =
            data.user.user_metadata?.avatar_url ||
            data.user.user_metadata?.picture ||
            null;

          if (googlePhotoUrl) {
            await updateProfile(data.user.id, { avatar_url: googlePhotoUrl });
          }
        }
      }

      return { error: null };
    } catch (err: any) {
      // Handle specific Google Sign-In errors
      if (err.code === 'SIGN_IN_CANCELLED') {
        return { error: null }; // User cancelled, not an error
      }
      console.error('Google Sign-In error:', err);
      return { error: err.message || 'Google Sign-In failed. Please try again.' };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    // Also sign out from Google SDK to clear cached account
    try {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      await GoogleSignin.signOut();
    } catch {
      // Ignore – module may not be available (Expo Go) or no Google session
    }
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  }, []);

  const verifyRecoveryOtp = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isLoading,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        resetPassword,
        verifyRecoveryOtp,
        updatePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
