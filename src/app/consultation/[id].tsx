import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Modal, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, Stack, useRouter , useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getConsultations, getDiagnoses, getTreatments, getExercisePlans, createDiagnosis, createTreatment, createExercisePlan } from '@/services/medicalService';
import { supabase } from '@/lib/supabase';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import type { Consultation, Diagnosis, Treatment, ExercisePlan } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SafeAreaView } from 'react-native-safe-area-context';

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
          <View style={[styles.card, Shadows.sm]}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="calendar" size={18} color={Colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{new Date(consultation.consultation_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
              </View>
            </View>
            
            {consultation.symptoms && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="thermometer" size={18} color={Colors.primary} />
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
                  <Ionicons name="medical" size={18} color={Colors.primary} />
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
                  <Ionicons name="bandage" size={18} color={Colors.primary} />
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
                  <Ionicons name="document-text" size={18} color={Colors.primary} />
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
              <View key={d.id} style={[styles.itemCard, Shadows.sm]}>
                <View style={[styles.itemAccent, { backgroundColor: Colors.error }]} />
                <View style={styles.itemContent}>
                  <View style={styles.itemHeader}>
                    <Ionicons name="bandage" size={20} color={Colors.error} style={{ marginRight: Spacing.sm }} />
                    <Text style={styles.itemTitle}>{d.title}</Text>
                  </View>
                  {d.symptoms && <Text style={styles.itemDesc}>{d.symptoms}</Text>}
                </View>
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
              <View key={t.id} style={[styles.itemCard, Shadows.sm]}>
                <View style={[styles.itemAccent, { backgroundColor: Colors.primary }]} />
                <View style={styles.itemContent}>
                  <View style={styles.itemHeader}>
                    <Ionicons name="flask" size={20} color={Colors.primary} style={{ marginRight: Spacing.sm }} />
                    <Text style={styles.itemTitle}>{t.name}</Text>
                  </View>
                  {t.instructions && <Text style={styles.itemDesc}>{t.instructions}</Text>}
                </View>
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
              <View key={e.id} style={[styles.itemCard, Shadows.sm]}>
                <View style={[styles.itemAccent, { backgroundColor: Colors.info }]} />
                <View style={styles.itemContent}>
                  <View style={styles.itemHeader}>
                    <Ionicons name="fitness" size={20} color={Colors.info} style={{ marginRight: Spacing.sm }} />
                    <Text style={styles.itemTitle}>{e.name}</Text>
                  </View>
                  {e.instructions && <Text style={styles.itemDesc}>{e.instructions}</Text>}
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>

      {/* Add Modal */}
      <Modal transparent visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <SafeAreaView edges={['bottom']} style={styles.modalContent}>
            <View style={styles.dragHandleContainer}>
              <View style={styles.dragHandle} />
            </View>
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
          </SafeAreaView>
        </KeyboardAvoidingView>
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
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.text },
  card: {
    backgroundColor: Colors.surfaceElevated, padding: Spacing.base,
    borderRadius: BorderRadius.xl, borderWidth: 0,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: Spacing.sm },
  infoIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryFaded, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  infoContent: { flex: 1, justifyContent: 'center' },
  infoLabel: { fontSize: Typography.xs, color: Colors.textTertiary, fontWeight: Typography.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: Typography.base, color: Colors.text, marginTop: 2, lineHeight: 22, fontWeight: Typography.medium },
  emptyCard: { backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center' },
  emptyText: { fontSize: Typography.sm, color: Colors.textTertiary, fontStyle: 'italic' },
  itemCard: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.xl, marginBottom: Spacing.sm, borderWidth: 0, flexDirection: 'row', overflow: 'hidden' },
  itemAccent: { width: 6 },
  itemContent: { flex: 1, padding: Spacing.base },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  itemTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.text },
  itemDesc: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, width: '100%', borderTopLeftRadius: BorderRadius['2xl'], borderTopRightRadius: BorderRadius['2xl'], paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Platform.OS === 'ios' ? Spacing['4xl'] : Spacing.xl, ...Shadows.xl },
  dragHandleContainer: { alignItems: 'center', marginBottom: Spacing.lg },
  dragHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.disabled },
  modalTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.text, marginBottom: Spacing.lg },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing.md, gap: Spacing.sm },
});
