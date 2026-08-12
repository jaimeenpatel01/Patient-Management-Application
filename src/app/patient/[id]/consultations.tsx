import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getConsultations } from '@/services/medicalService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Consultation } from '@/types';

export default function PatientConsultationsScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadConsultations = useCallback(async () => {
    if (!patientId) return;
    const { data } = await getConsultations(patientId);
    setConsultations(data);
  }, [patientId]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadConsultations().finally(() => setIsLoading(false));
    }, [loadConsultations])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadConsultations();
    setIsRefreshing(false);
  };

  const renderCard = ({ item }: { item: Consultation }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/consultation/${item.id}` as any)}
      activeOpacity={0.7}
    >
      <View style={styles.cardIcon}>
        <Ionicons name="medical" size={24} color={Colors.primary} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardDate}>{new Date(item.consultation_date).toLocaleDateString()}</Text>
        {item.symptoms && (
          <Text style={styles.cardText} numberOfLines={1}>
            <Text style={styles.label}>Symptoms: </Text>{item.symptoms}
          </Text>
        )}
        {item.diagnosis && (
          <Text style={styles.cardText} numberOfLines={1}>
            <Text style={styles.label}>Diagnosis: </Text>{item.diagnosis}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Medical Records' }} />
      <View style={styles.container}>
        {consultations.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No Records Found"
            subtitle="This patient doesn't have any consultations yet."
            actionLabel="Add Consultation"
            onAction={() => router.push(`/consultation/add?patientId=${patientId}` as any)}
          />
        ) : (
          <FlatList
            data={consultations}
            keyExtractor={(item) => item.id}
            renderItem={renderCard}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
          />
        )}
        <TouchableOpacity style={styles.fab} onPress={() => router.push(`/consultation/add?patientId=${patientId}` as any)} activeOpacity={0.8}>
          <Ionicons name="add" size={28} color={Colors.textInverse} />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: Spacing.base, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    padding: Spacing.base, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm, ...Shadows.sm,
  },
  cardIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryFaded,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  cardContent: { flex: 1, marginRight: Spacing.sm },
  cardDate: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.text, marginBottom: 4 },
  cardText: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  label: { fontWeight: Typography.medium, color: Colors.text },
  fab: {
    position: 'absolute', right: Spacing.lg, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', ...Shadows.lg,
  },
});
