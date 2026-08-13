import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createAttendance } from '@/services/attendanceService';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { PatientSearchPicker } from '@/components/ui/PatientSearchPicker';
import { AppDateTimePicker } from '@/components/ui/DateTimePicker';
import { Button } from '@/components/ui/Button';
import type { Patient } from '@/types';
import { getPatients } from '@/services/patientService';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MarkAttendanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Format current time HH:MM
  const now = new Date();
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMins = String(now.getMinutes()).padStart(2, '0');
  const [attendanceTime, setAttendanceTime] = useState(`${currentHours}:${currentMins}`);
  
  const [notes, setNotes] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      getPatients().then((result) => {
        if (result.data) {
          setPatients(result.data);
        }
        setIsLoadingPatients(false);
      });
    }, [])
  );

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!selectedPatientId) e.patient = 'Select a patient';
    if (!attendanceDate) e.date = 'Date is required';
    if (!attendanceTime) e.time = 'Time is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !selectedPatientId) return;

    setIsSubmitting(true);
    const { error } = await createAttendance({
      patient_id: selectedPatientId,
      attendance_date: attendanceDate,
      attendance_time: attendanceTime,
      notes: notes.trim() || null,
    });
    setIsSubmitting(false);

    if (error) {
      Alert.alert('Error', error);
    } else {
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Mark Attendance' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, Spacing['4xl']) }]} keyboardShouldPersistTaps="handled">
        
        <Text style={styles.sectionTitle}>Patient</Text>
        <PatientSearchPicker
          patients={patients}
          loading={isLoadingPatients}
          value={selectedPatientId}
          onSelect={(patient) => setSelectedPatientId(patient.id)}
          onClear={() => setSelectedPatientId(null)}
          error={errors.patient}
          placeholder="Select patient for attendance..."
        />

        <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Details</Text>
        <AppDateTimePicker
          label="Date *"
          value={attendanceDate}
          onChange={setAttendanceDate}
          mode="date"
          error={errors.date}
        />
        <AppDateTimePicker
          label="Time *"
          value={attendanceTime}
          onChange={setAttendanceTime}
          mode="time"
          error={errors.time}
        />

        <Input 
          label="Notes" 
          placeholder="Optional notes..." 
          leftIcon="document-text-outline" 
          value={notes} 
          onChangeText={setNotes} 
          multiline 
          numberOfLines={3} 
        />

        <View style={styles.submitContainer}>
          <Button 
            title="Mark Attendance" 
            onPress={handleSubmit} 
            loading={isSubmitting} 
            icon={<Ionicons name="checkmark-circle-outline" size={20} color={Colors.textInverse} />} 
          />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base },
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.text, marginBottom: Spacing.base },
  submitContainer: { marginTop: Spacing.xl },
});
