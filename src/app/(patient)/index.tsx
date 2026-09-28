import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/contexts/AlertContext';
import {
  getMyPatientProfile,
  getUpcomingAttendanceForPatient,
  type MyPatientProfile,
} from '@/services/patientPortalService';
import type { Attendance } from '@/types';
import { formatTime12Hour } from '@/lib/formatters';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

function formatFullDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function PatientHomeScreen() {
  const { profile, signOut } = useAuth();
  const { showAlert } = useAlert();

  const [patient, setPatient] = useState<MyPatientProfile | null>(null);
  const [upcoming, setUpcoming] = useState<Attendance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const { data: patientData, error: patientError } = await getMyPatientProfile();
    setPatient(patientData);
    setError(patientError && !patientData ? patientError : null);

    if (patientData) {
      const { data: attendanceData } = await getUpcomingAttendanceForPatient(patientData.id);
      setUpcoming(attendanceData);
    } else {
      setUpcoming(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchData().finally(() => setIsLoading(false));
    }, [fetchData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleSignOut = () => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  if (isLoading) {
    return <LoadingScreen message="Loading your portal..." />;
  }

  const physioName = patient?.doctor?.full_name;

  return (
    <View style={styles.container}>
      <Tabs.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSignOut}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ marginRight: Spacing.base }}
            >
              <Ionicons name="log-out-outline" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        <Text style={styles.greeting}>Hi {profile?.full_name?.split(' ')[0] || 'there'}</Text>

        {!patient ? (
          <EmptyState
            icon="link-outline"
            title="No patient record linked"
            subtitle={
              error ||
              'Your account isn’t linked to a patient record yet. Please contact your physiotherapist for your invite code.'
            }
          />
        ) : (
          <>
            {/* Physio card */}
            <View style={[styles.card, Shadows.sm]}>
              <View style={styles.cardIconBg}>
                <Ionicons name="medkit-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardLabel}>Your Physiotherapist</Text>
                <Text style={styles.cardValue}>{physioName || 'Your Physiotherapist'}</Text>
              </View>
            </View>

            {/* Upcoming attendance card */}
            <Text style={styles.sectionTitle}>Next Appointment</Text>
            {upcoming ? (
              <View style={[styles.card, styles.appointmentCard, Shadows.sm]}>
                <View style={[styles.cardIconBg, { backgroundColor: Colors.infoLight }]}>
                  <Ionicons name="calendar-outline" size={22} color={Colors.info} />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardValue}>{formatFullDate(upcoming.attendance_date)}</Text>
                  <Text style={styles.cardLabel}>{formatTime12Hour(upcoming.attendance_time)}</Text>
                </View>
              </View>
            ) : (
              <View style={[styles.card, Shadows.sm]}>
                <View style={styles.cardIconBg}>
                  <Ionicons name="calendar-outline" size={22} color={Colors.primary} />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardValue}>No upcoming appointments</Text>
                  <Text style={styles.cardLabel}>Your physiotherapist will schedule your next visit.</Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  greeting: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  appointmentCard: {
    marginBottom: Spacing.base,
  },
  cardIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  cardTextContainer: { flex: 1 },
  cardLabel: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    fontWeight: Typography.medium,
    marginTop: 2,
  },
  cardValue: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text,
  },
});
