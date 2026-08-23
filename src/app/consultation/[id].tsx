import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { useLocalSearchParams, Stack, useRouter , useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getConsultations, getDiagnoses, getTreatments, getExercisePlans, createDiagnosis, createTreatment, createExercisePlan } from '@/services/medicalService';
import { supabase } from '@/lib/supabase';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import type { Consultation, Diagnosis, Treatment, ExercisePlan } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ConsultationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [exercisePlans, setExercisePlans] = useState<ExercisePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'diagnosis' | 'treatment' | 'exercise' | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openModal = (type: 'diagnosis' | 'treatment' | 'exercise') => {
    setModalType(type);
    setNewItemTitle('');
    setNewItemDesc('');
    setModalVisible(true);
  };

  const handleAddItem = async () => {
    if (!newItemTitle.trim() || !consultation) return;
    setIsSubmitting(true);
    
    if (modalType === 'diagnosis') {
      const { data } = await createDiagnosis({
        consultation_id: id,
        patient_id: consultation.patient_id,
        title: newItemTitle,
        symptoms: newItemDesc || null,
        clinical_assessment: null,
        notes: null,
        diagnosis_date: new Date().toISOString(),
      });
      if (data) setDiagnoses([...diagnoses, data]);
    } else if (modalType === 'treatment') {
      const { data } = await createTreatment({
        consultation_id: id,
        patient_id: consultation.patient_id,
        name: newItemTitle,
        description: null,
        instructions: newItemDesc || null,
        frequency: null,
        duration: null,
        notes: null,
      });
      if (data) setTreatments([...treatments, data]);
    } else if (modalType === 'exercise') {
      const { data } = await createExercisePlan({
        consultation_id: id,
        patient_id: consultation.patient_id,
        name: newItemTitle,
        description: null,
        instructions: newItemDesc || null,
        sets: null,
        repetitions: null,
        duration: null,
        frequency: null,
        start_date: null,
        end_date: null,
        media_url: null,
      });
      if (data) setExercisePlans([...exercisePlans, data]);
    }
    
    setIsSubmitting(false);
    setModalVisible(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      const loadData = async () => {
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{new Date(consultation.consultation_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
              </View>
            </View>
            
            {consultation.symptoms && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="thermometer-outline" size={18} color={Colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Symptoms</Text>
                  <Text style={styles.infoValue}>{consultation.symptoms}</Text>
                </View>
              </View>
            )}

            {consultation.assessment && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="medical-outline" size={18} color={Colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Clinical Assessment</Text>
                  <Text style={styles.infoValue}>{consultation.assessment}</Text>
                </View>
              </View>
            )}

            {consultation.diagnosis && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="bandage-outline" size={18} color={Colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Primary Diagnosis</Text>
                  <Text style={styles.infoValue}>{consultation.diagnosis}</Text>
                </View>
              </View>
            )}

            {consultation.notes && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Treatment / Notes</Text>
                  <Text style={styles.infoValue}>{consultation.notes}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Diagnoses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Diagnoses</Text>
            <Button title="Add" size="sm" variant="outline" fullWidth={false} onPress={() => openModal('diagnosis')} icon={<Ionicons name="add" size={16} color={Colors.primary} />} />
          </View>
          {diagnoses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No diagnoses added yet.</Text>
            </View>
          ) : (
            diagnoses.map(d => (
              <View key={d.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Ionicons name="bandage-outline" size={20} color={Colors.primary} style={{ marginRight: Spacing.sm }} />
                  <Text style={styles.itemTitle}>{d.title}</Text>
                </View>
                {d.symptoms && <Text style={styles.itemDesc}>{d.symptoms}</Text>}
              </View>
            ))
          )}
        </View>

        {/* Treatments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Treatments</Text>
            <Button title="Add" size="sm" variant="outline" fullWidth={false} onPress={() => openModal('treatment')} icon={<Ionicons name="add" size={16} color={Colors.primary} />} />
          </View>
          {treatments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No treatments added yet.</Text>
            </View>
          ) : (
            treatments.map(t => (
              <View key={t.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Ionicons name="flask-outline" size={20} color={Colors.primary} style={{ marginRight: Spacing.sm }} />
                  <Text style={styles.itemTitle}>{t.name}</Text>
                </View>
                {t.instructions && <Text style={styles.itemDesc}>{t.instructions}</Text>}
              </View>
            ))
          )}
        </View>

        {/* Exercise Plans */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exercise Plans</Text>
            <Button title="Add" size="sm" variant="outline" fullWidth={false} onPress={() => openModal('exercise')} icon={<Ionicons name="add" size={16} color={Colors.primary} />} />
          </View>
          {exercisePlans.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No exercise plans added yet.</Text>
            </View>
          ) : (
            exercisePlans.map(e => (
              <View key={e.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Ionicons name="fitness-outline" size={20} color={Colors.primary} style={{ marginRight: Spacing.sm }} />
                  <Text style={styles.itemTitle}>{e.name}</Text>
                </View>
                {e.instructions && <Text style={styles.itemDesc}>{e.instructions}</Text>}
              </View>
            ))
          )}
        </View>

      </ScrollView>

      {/* Add Modal */}
      <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Add {modalType === 'diagnosis' ? 'Diagnosis' : modalType === 'treatment' ? 'Treatment' : 'Exercise Plan'}
            </Text>
            <Input
              label={modalType === 'diagnosis' ? 'Diagnosis Title' : 'Name'}
              placeholder="Enter title..."
              value={newItemTitle}
              onChangeText={setNewItemTitle}
            />
            <Input
              label={modalType === 'diagnosis' ? 'Symptoms' : 'Instructions'}
              placeholder="Enter details..."
              value={newItemDesc}
              onChangeText={setNewItemDesc}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="ghost" fullWidth={false} onPress={() => setModalVisible(false)} />
              <Button title="Save" fullWidth={false} onPress={handleAddItem} loading={isSubmitting} disabled={!newItemTitle.trim()} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: Typography.base, color: Colors.error },
  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.text },
  card: {
    backgroundColor: Colors.surface, padding: Spacing.base,
    borderRadius: BorderRadius.lg, ...Shadows.sm,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: Spacing.sm },
  infoIconContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primaryFaded, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: Typography.xs, color: Colors.textTertiary, fontWeight: Typography.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: Typography.base, color: Colors.text, marginTop: 2, lineHeight: 22 },
  emptyCard: { backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center' },
  emptyText: { fontSize: Typography.sm, color: Colors.textTertiary, fontStyle: 'italic' },
  itemCard: { backgroundColor: Colors.surface, padding: Spacing.base, borderRadius: BorderRadius.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  itemTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.text },
  itemDesc: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  modalContent: { backgroundColor: Colors.surface, width: '100%', borderRadius: BorderRadius.lg, padding: Spacing.xl, ...Shadows.md },
  modalTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.text, marginBottom: Spacing.lg },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing.lg, gap: Spacing.sm },
});
