import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createConsultation } from '@/services/medicalService';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function AddConsultationScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [assessment, setAssessment] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!patientId) {
      Alert.alert('Error', 'Missing patient ID');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setErrors({ date: 'Use YYYY-MM-DD format' });
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    const { error } = await createConsultation({
      patient_id: patientId,
      appointment_id: null,
      consultation_date: date,
      symptoms: symptoms.trim() || null,
      diagnosis: diagnosis.trim() || null,
      assessment: assessment.trim() || null,
      notes: notes.trim() || null,
      follow_up_date: null,
    });
    setIsSubmitting(false);

    if (error) Alert.alert('Error', error);
    else router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'New Consultation' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input label="Date *" placeholder="YYYY-MM-DD" leftIcon="calendar-outline" value={date} onChangeText={setDate} error={errors.date} />
        <Input label="Symptoms" placeholder="Patient's symptoms..." value={symptoms} onChangeText={setSymptoms} multiline numberOfLines={3} />
        <Input label="Diagnosis" placeholder="Primary diagnosis..." value={diagnosis} onChangeText={setDiagnosis} />
        <Input label="Clinical Assessment" placeholder="Objective findings..." value={assessment} onChangeText={setAssessment} multiline numberOfLines={3} />
        <Input label="Notes" placeholder="Additional notes..." value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

        <View style={styles.submitContainer}>
          <Button title="Save Consultation" onPress={handleSubmit} loading={isSubmitting} icon={<Ionicons name="checkmark-circle-outline" size={20} color={Colors.textInverse} />} />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  submitContainer: { marginTop: Spacing.xl },
});
