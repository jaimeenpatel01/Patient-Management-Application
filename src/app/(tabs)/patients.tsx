import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getPatients } from '@/services/patientService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { PatientSearchPicker } from '@/components/ui/PatientSearchPicker';
import { getInitials } from '@/lib/formatters';
import type { Patient } from '@/types';

function formatPhone(phone: string | null): string {
  return phone || 'No phone';
}

export default function PatientsScreen() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPatients = useCallback(async () => {
    setError(null);
    const result = await getPatients();

    if (result.error) {
      setError(result.error);
    }
    setPatients(result.data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPatients().finally(() => setIsLoading(false));
    }, [loadPatients])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPatients();
    setIsRefreshing(false);
  };

  const renderPatientCard = useCallback(({ item }: { item: Patient }) => (
    <TouchableOpacity
      style={[styles.patientCard, Shadows.md]}
      onPress={() => router.push(`/patient/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.cardAccent} />
      <View style={styles.cardContent}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{getInitials(item.full_name)}</Text>
        </View>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName} numberOfLines={1}>{item.full_name}</Text>
          <View style={styles.patientMeta}>
            <Ionicons name="call-outline" size={14} color={Colors.textTertiary} />
            <Text style={styles.patientMetaText}>{formatPhone(item.phone)}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
      </View>
    </TouchableOpacity>
  ), [router]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <PatientSearchPicker
          patients={patients}
          loading={isLoading}
          value={null}
          placeholder="Search for a patient..."
          onSelect={(patient) => router.push(`/patient/${patient.id}` as any)}
          style={{ backgroundColor: Colors.surface, borderWidth: 0 }}
        />
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Patient count */}
      {patients.length > 0 && (
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {patients.length} patient{patients.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Patient list or empty state */}
      {patients.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No Patients Yet"
          subtitle="Add your first patient to get started with managing their records."
          actionLabel="Add Patient"
          onAction={() => router.push('/patient/add' as any)}
        />
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.id}
          renderItem={renderPatientCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/patient/add' as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={Colors.textInverse} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  searchContainer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.sm,
    color: Colors.error,
    flex: 1,
  },
  countContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  countText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: 100,
  },
  patientCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 0,
  },
  cardAccent: {
    width: 6,
    backgroundColor: Colors.primaryLight,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.1)',
  },
  avatarText: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.primary,
  },
  patientInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  patientName: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  patientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  patientMetaText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.xl,
  },
});
