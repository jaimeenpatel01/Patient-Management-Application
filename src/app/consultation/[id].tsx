import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getConsultations, getDiagnoses, getTreatments, getExercisePlans } from '@/services/medicalService';
import { supabase } from '@/lib/supabase';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import type { Consultation, Diagnosis, Treatment, ExercisePlan } from '@/types';
import { useFocusEffect } from 'expo-router';
import { Button } from '@/components/ui/Button';

export default function ConsultationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [exercisePlans, setExercisePlans] = useState<ExercisePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      const loadData = async () => {
        setIsLoading(true);
        // We don't have a getConsultationById in the service yet, so we query it directly
        const { data: cData } = await supabase.from('consultations').select('*').eq('id', id).single();
        if (cData) setConsultation(cData);

        const [dRes, tRes, eRes] = await Promise.all([
          getDiagnoses(id),
          getTreatments(id),
          getExercisePlans(id),
        ]);

        setDiagnoses(dRes.data);
        setTreatments(tRes.data);
        setExercisePlans(eRes.data);
        setIsLoading(false);
      };
      loadData();
    }, [id])
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!consultation) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Consultation not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Consultation Details' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Core Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{consultation.consultation_date}</Text>
          </View>
          {consultation.symptoms && (
            <View style={styles.row}>
              <Text style={styles.label}>Symptoms</Text>
              <Text style={styles.value}>{consultation.symptoms}</Text>
            </View>
          )}
          {consultation.assessment && (
            <View style={styles.row}>
              <Text style={styles.label}>Clinical Assessment</Text>
              <Text style={styles.value}>{consultation.assessment}</Text>
            </View>
          )}
        </View>

        {/* Diagnoses */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Diagnoses</Text>
          <Button title="Add" size="sm" variant="outline" onPress={() => {}} style={{ minHeight: 32 }} />
        </View>
        {diagnoses.length === 0 ? <Text style={styles.emptyText}>No diagnoses added</Text> : (
          diagnoses.map(d => (
            <View key={d.id} style={styles.card}>
              <Text style={styles.itemTitle}>{d.title}</Text>
              {d.symptoms && <Text style={styles.itemDesc}>{d.symptoms}</Text>}
            </View>
          ))
        )}

        {/* Treatments */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Treatments</Text>
          <Button title="Add" size="sm" variant="outline" onPress={() => {}} style={{ minHeight: 32 }} />
        </View>
        {treatments.length === 0 ? <Text style={styles.emptyText}>No treatments added</Text> : (
          treatments.map(t => (
            <View key={t.id} style={styles.card}>
              <Text style={styles.itemTitle}>{t.name}</Text>
              {t.instructions && <Text style={styles.itemDesc}>{t.instructions}</Text>}
            </View>
          ))
        )}

        {/* Exercise Plans */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Exercise Plans</Text>
          <Button title="Add" size="sm" variant="outline" onPress={() => {}} style={{ minHeight: 32 }} />
        </View>
        {exercisePlans.length === 0 ? <Text style={styles.emptyText}>No exercise plans added</Text> : (
          exercisePlans.map(e => (
            <View key={e.id} style={styles.card}>
              <Text style={styles.itemTitle}>{e.name}</Text>
              {e.instructions && <Text style={styles.itemDesc}>{e.instructions}</Text>}
            </View>
          ))
        )}

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: Typography.base, color: Colors.error },
  card: {
    backgroundColor: Colors.surface, padding: Spacing.base,
    borderRadius: BorderRadius.lg, marginBottom: Spacing.md, ...Shadows.sm,
  },
  cardTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.primary, marginBottom: Spacing.sm },
  row: { marginBottom: Spacing.sm },
  label: { fontSize: Typography.xs, color: Colors.textTertiary, textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: Typography.base, color: Colors.text },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.text },
  emptyText: { fontSize: Typography.sm, color: Colors.textTertiary, fontStyle: 'italic', marginBottom: Spacing.md },
  itemTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.text },
  itemDesc: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
});
