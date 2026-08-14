import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getConsultations, deleteConsultation } from '@/services/medicalService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionMenu } from '@/components/ui/ActionMenu';
import type { Consultation } from '@/types';

export default function PatientConsultationsScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);


  const loadConsultations = useCallback(async () => {
    if (!patientId) return;
    const { data } = await getConsultations(patientId);
    setConsultations(data);
  }, [patientId]);

  useFocusEffect(
    useCallback(() => {
      loadConsultations().finally(() => setIsLoading(false));
    }, [loadConsultations])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadConsultations();
    setIsRefreshing(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Consultation', 'Are you sure you want to delete this consultation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteConsultation(id);
          loadConsultations();
        },
      },
    ]);
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
      <View style={styles.actionsContainer}>
        <TouchableOpacity onPress={() => setActiveActionId(item.id)} style={styles.actionBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
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
        
        <ActionMenu
          visible={!!activeActionId}
          onClose={() => setActiveActionId(null)}
          options={[
            {
              label: 'Edit',
              icon: 'pencil-outline',
              color: Colors.primary,
              onPress: () => {
                const id = activeActionId;
                setActiveActionId(null);
                if (id) router.push(`/consultation/add?patientId=${patientId}&id=${id}` as any);
              },
            },
            {
              label: 'Delete',
              icon: 'trash-outline',
              color: Colors.error,
              onPress: () => {
                const id = activeActionId;
                setActiveActionId(null);
                if (id) handleDelete(id);
              },
            },
          ]}
        />

        <TouchableOpacity style={[styles.fab, { bottom: Spacing.lg }]} onPress={() => router.push(`/consultation/add?patientId=${patientId}` as any)} activeOpacity={0.8}>
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
  actionsContainer: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: Spacing.sm, marginLeft: Spacing.xs },
  fab: {
    position: 'absolute', right: Spacing.lg, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', ...Shadows.lg,
  },
});
