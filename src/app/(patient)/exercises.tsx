import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Image } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { getMyPatientProfile, getExercisePlansForPatient } from '@/services/patientPortalService';
import type { ExercisePlan } from '@/types';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

function ExercisePlanCard({ item }: { item: ExercisePlan }) {
  const details: string[] = [];
  if (item.sets) details.push(`${item.sets} sets`);
  if (item.repetitions) details.push(`${item.repetitions} reps`);
  if (item.duration) details.push(item.duration);
  if (item.frequency) details.push(item.frequency);

  return (
    <View style={[styles.card, Shadows.sm]}>
      {item.media_url ? (
        <Image source={{ uri: item.media_url }} style={styles.thumbnail} resizeMode="cover" />
      ) : (
        <View style={styles.thumbnailPlaceholder}>
          <Ionicons name="fitness" size={26} color={Colors.primary} />
        </View>
      )}

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>

        {details.length > 0 && (
          <Text style={styles.cardMeta}>{details.join(' • ')}</Text>
        )}

        {item.instructions && (
          <Text style={styles.cardInstructions} numberOfLines={3}>
            {item.instructions}
          </Text>
        )}

        {item.description && !item.instructions && (
          <Text style={styles.cardInstructions} numberOfLines={3}>
            {item.description}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function PatientExercisesScreen() {
  const [plans, setPlans] = useState<ExercisePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const { data: patient, error: patientError } = await getMyPatientProfile();
    if (!patient) {
      setPlans([]);
      setError(patientError);
      return;
    }
    setError(null);
    const { data } = await getExercisePlansForPatient(patient.id);
    setPlans(data);
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

  if (isLoading) {
    return <LoadingScreen message="Loading your exercise plans..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ExercisePlanCard item={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <EmptyState
            icon="fitness-outline"
            title="No exercise plans yet"
            subtitle={error || 'Your physiotherapist hasn’t assigned any exercise plans yet.'}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: { padding: Spacing.base, paddingBottom: Spacing['4xl'], flexGrow: 1 },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  thumbnail: {
    width: 84,
    height: 84,
  },
  thumbnailPlaceholder: {
    width: 84,
    height: 84,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    padding: Spacing.base,
  },
  cardTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text,
  },
  cardMeta: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: Typography.medium,
    marginTop: 4,
  },
  cardInstructions: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 6,
  },
});
