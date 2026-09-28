import React, { useState, useCallback } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, ActivityIndicator, Modal, TouchableOpacity, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, Stack, useRouter , useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getConsultations, getDiagnoses, getTreatments, getExercisePlans, createDiagnosis, createTreatment, createExercisePlan, uploadExerciseMedia } from '@/services/offline/medicalService.offline';
import { supabase } from '@/lib/supabase';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import type { Consultation, Diagnosis, Treatment, ExercisePlan } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '@/contexts/AlertContext';

export default function ConsultationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showAlert } = useAlert();

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [exercisePlans, setExercisePlans] = useState<ExercisePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'diagnosis' | 'treatment' | 'exercise' | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newSets, setNewSets] = useState('');
  const [newReps, setNewReps] = useState('');
  const [newDuration, setNewDuration] = useState('');
  const [newFrequency, setNewFrequency] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; base64: string; type: string; name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openModal = (type: 'diagnosis' | 'treatment' | 'exercise') => {
    setModalType(type);
    setNewItemTitle('');
    setNewItemDesc('');
    setNewSets('');
    setNewReps('');
    setNewDuration('');
    setNewFrequency('');
    setSelectedMedia(null);
    setModalVisible(true);
  };

  const pickExerciseMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (!asset.base64) {
        showAlert('Error', 'Could not read the selected image.');
        return;
      }
      const uriParts = asset.uri.split('/');
      const fileName = asset.fileName || uriParts[uriParts.length - 1];
      setSelectedMedia({
        uri: asset.uri,
        base64: asset.base64,
        type: 'image/jpeg',
        name: fileName,
      });
    }
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
      let mediaUrl: string | null = null;
      if (selectedMedia) {
        const { url, error: uploadError } = await uploadExerciseMedia({
          patient_id: consultation.patient_id,
          file_name: selectedMedia.name,
          file_type: selectedMedia.type,
          base64Data: selectedMedia.base64,
        });
        if (uploadError) {
          showAlert('Upload Failed', uploadError);
          setIsSubmitting(false);
          return;
        }
        mediaUrl = url;
      }

      const { data } = await createExercisePlan({
        consultation_id: id,
        patient_id: consultation.patient_id,
        name: newItemTitle,
        description: null,
        instructions: newItemDesc || null,
        sets: newSets.trim() ? parseInt(newSets, 10) : null,
        repetitions: newReps.trim() ? parseInt(newReps, 10) : null,
        duration: newDuration.trim() || null,
        frequency: newFrequency.trim() || null,
        start_date: null,
        end_date: null,
        media_url: mediaUrl,
      });
      if (data) setExercisePlans([...exercisePlans, data]);
    }

    setIsSubmitting(false);
    setModalVisible(false);
  };

  const handleShareExercisePlan = async (plan: ExercisePlan) => {
    try {
      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
              h1 { color: #2c3e50; border-bottom: 2px solid #0D9488; padding-bottom: 10px; margin-bottom: 20px; }
              .info p { margin: 8px 0; font-size: 16px; }
              .info strong { display: inline-block; width: 140px; color: #555; }
              .media { margin-top: 24px; text-align: center; }
              .media img { max-width: 100%; max-height: 420px; border-radius: 8px; }
            </style>
          </head>
          <body>
            <h1>Exercise Plan: ${plan.name}</h1>
            <div class="info">
              <p><strong>Sets:</strong> ${plan.sets ?? 'N/A'}</p>
              <p><strong>Repetitions:</strong> ${plan.repetitions ?? 'N/A'}</p>
              <p><strong>Duration:</strong> ${plan.duration || 'N/A'}</p>
              <p><strong>Frequency:</strong> ${plan.frequency || 'N/A'}</p>
              <p><strong>Instructions:</strong> ${plan.instructions || 'N/A'}</p>
              ${plan.start_date ? `<p><strong>Start Date:</strong> ${plan.start_date}</p>` : ''}
              ${plan.end_date ? `<p><strong>End Date:</strong> ${plan.end_date}</p>` : ''}
            </div>
            ${plan.media_url ? `<div class="media"><img src="${plan.media_url}" /></div>` : ''}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `${plan.name} Exercise Plan`,
      });
    } catch (error: any) {
      showAlert('Error', error.message);
    }
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
            exercisePlans.map(e => {
              const metaParts = [
                e.sets ? `${e.sets} sets` : null,
                e.repetitions ? `${e.repetitions} reps` : null,
                e.duration,
                e.frequency,
              ].filter(Boolean);
              return (
                <View key={e.id} style={[styles.itemCard, Shadows.sm]}>
                  <View style={[styles.itemAccent, { backgroundColor: Colors.info }]} />
                  <View style={styles.itemContent}>
                    <View style={styles.itemHeader}>
                      <Ionicons name="fitness" size={20} color={Colors.info} style={{ marginRight: Spacing.sm }} />
                      <Text style={[styles.itemTitle, { flex: 1 }]}>{e.name}</Text>
                      <TouchableOpacity
                        onPress={() => handleShareExercisePlan(e)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="share-outline" size={20} color={Colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    {e.instructions && <Text style={styles.itemDesc}>{e.instructions}</Text>}
                    {metaParts.length > 0 && <Text style={styles.itemMeta}>{metaParts.join(' • ')}</Text>}
                    {e.media_url && (
                      <Image source={{ uri: e.media_url }} style={styles.exerciseThumbnail} resizeMode="cover" />
                    )}
                  </View>
                </View>
              );
            })
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
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.modalScroll}>
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

              {modalType === 'exercise' && (
                <>
                  <View style={styles.rowInputs}>
                    <Input
                      label="Sets"
                      placeholder="e.g. 3"
                      value={newSets}
                      onChangeText={setNewSets}
                      keyboardType="number-pad"
                      containerStyle={styles.rowInput}
                    />
                    <Input
                      label="Repetitions"
                      placeholder="e.g. 12"
                      value={newReps}
                      onChangeText={setNewReps}
                      keyboardType="number-pad"
                      containerStyle={styles.rowInput}
                    />
                  </View>
                  <View style={styles.rowInputs}>
                    <Input
                      label="Duration"
                      placeholder="e.g. 10 mins"
                      value={newDuration}
                      onChangeText={setNewDuration}
                      containerStyle={styles.rowInput}
                    />
                    <Input
                      label="Frequency"
                      placeholder="e.g. Daily"
                      value={newFrequency}
                      onChangeText={setNewFrequency}
                      containerStyle={styles.rowInput}
                    />
                  </View>

                  <Text style={styles.fieldLabel}>Photo (optional)</Text>
                  {selectedMedia ? (
                    <View style={styles.mediaPreviewContainer}>
                      <Image source={{ uri: selectedMedia.uri }} style={styles.mediaPreview} />
                      <TouchableOpacity style={styles.removeMediaBtn} onPress={() => setSelectedMedia(null)}>
                        <Ionicons name="close-circle" size={22} color={Colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.attachMediaBtn} onPress={pickExerciseMedia}>
                      <Ionicons name="image-outline" size={20} color={Colors.primary} />
                      <Text style={styles.attachMediaText}>Attach Photo</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
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
  itemMeta: { fontSize: Typography.xs, color: Colors.textTertiary, fontWeight: Typography.medium, marginTop: Spacing.xs, textTransform: 'capitalize' },
  exerciseThumbnail: { width: '100%', height: 140, borderRadius: BorderRadius.md, marginTop: Spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlayLight, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.surface, width: '100%', borderTopLeftRadius: BorderRadius['2xl'], borderTopRightRadius: BorderRadius['2xl'], paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Platform.OS === 'ios' ? Spacing['4xl'] : Spacing.xl, ...Shadows.xl, maxHeight: '85%' },
  modalScroll: { flexGrow: 0 },
  dragHandleContainer: { alignItems: 'center', marginBottom: Spacing.lg },
  dragHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.disabled },
  modalTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.text, marginBottom: Spacing.lg },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing.md, gap: Spacing.sm },
  rowInputs: { flexDirection: 'row', gap: Spacing.sm },
  rowInput: { flex: 1 },
  fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.text, marginBottom: Spacing.sm },
  attachMediaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surfaceSecondary, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    marginBottom: Spacing.base,
  },
  attachMediaText: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.primary },
  mediaPreviewContainer: { marginBottom: Spacing.base },
  mediaPreview: { width: '100%', height: 160, borderRadius: BorderRadius.lg },
  removeMediaBtn: { position: 'absolute', top: Spacing.xs, right: Spacing.xs },
});
