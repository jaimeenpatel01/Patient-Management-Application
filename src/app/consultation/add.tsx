import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createConsultation, updateConsultation } from '@/services/medicalService';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { AppDateTimePicker } from '@/components/ui/DateTimePicker';
import { Button } from '@/components/ui/Button';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/contexts/AlertContext';

export default function AddConsultationScreen() {
  const { patientId, id } = useLocalSearchParams<{ patientId: string; id?: string }>();
  const router = useRouter();
  const { showAlert } = useAlert();
  const [isFetchingRecord, setIsFetchingRecord] = useState(!!id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [assessment, setAssessment] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (id) {
      const fetchRecord = async () => {
        const { data } = await supabase.from('consultations').select('*').eq('id', id).single();
        if (data) {
          setDate(data.consultation_date);
          setSymptoms(data.symptoms || '');
          setDiagnosis(data.diagnosis || '');
          setAssessment(data.assessment || '');
          setNotes(data.notes || '');
        }
        setIsFetchingRecord(false);
      };
      fetchRecord();
    }
  }, [id]);

  const handleSubmit = async () => {
    if (!patientId) {
      showAlert('Error', 'Missing patient ID');
      return;
    }
    if (!date) {
      setErrors({ date: 'Date is required' });
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    let error;

    if (id) {
      const res = await updateConsultation(id, {
        consultation_date: date,
        symptoms: symptoms.trim() || null,
        diagnosis: diagnosis.trim() || null,
        assessment: assessment.trim() || null,
        notes: notes.trim() || null,
      });
      error = res.error;
    } else {
      const res = await createConsultation({
        patient_id: patientId,
        attendance_id: null,
        consultation_date: date,
        symptoms: symptoms.trim() || null,
        diagnosis: diagnosis.trim() || null,
        assessment: assessment.trim() || null,
        notes: notes.trim() || null,
        follow_up_date: null,
      });
      error = res.error;
    }
    
    setIsSubmitting(false);

    if (error) {
      showAlert('Error', error);
    } else {
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        router.back();
      }, 2500);
    }
  };

  if (isFetchingRecord) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: id ? 'Edit Consultation' : 'New Consultation' }} />

        <KeyboardAwareScrollView 
          style={styles.container} 
          contentContainerStyle={styles.content} 
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={50}
        >
        <AppDateTimePicker
          label="Date *"
          value={date}
          onChange={setDate}
          mode="date"
          error={errors.date}
        />
        <Input label="Symptoms" placeholder="Patient's symptoms..." value={symptoms} onChangeText={setSymptoms} multiline numberOfLines={3} />
        <Input label="Diagnosis" placeholder="Primary diagnosis..." value={diagnosis} onChangeText={setDiagnosis} />
        <Input label="Clinical Assessment" placeholder="Objective findings..." value={assessment} onChangeText={setAssessment} multiline numberOfLines={3} />
        <Input label="Notes" placeholder="Additional notes..." value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

        <View style={styles.submitContainer}>
          <Button title={id ? "Save Changes" : "Save Consultation"} onPress={handleSubmit} loading={isSubmitting} icon={<Ionicons name={id ? "save-outline" : "checkmark-circle-outline"} size={20} color={Colors.textInverse} />} />
        </View>
      </KeyboardAwareScrollView>

      <SuccessModal 
        visible={showSuccessModal} 
        message={id ? "Consultation updated successfully." : "Consultation saved successfully."} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  submitContainer: { marginTop: Spacing.xl },
});
