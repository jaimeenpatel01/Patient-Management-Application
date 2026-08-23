import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter, Stack, useLocalSearchParams , useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createAttendance, updateAttendance } from '@/services/attendanceService';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { PatientSearchPicker } from '@/components/ui/PatientSearchPicker';
import { AppDateTimePicker } from '@/components/ui/DateTimePicker';
import { Button } from '@/components/ui/Button';
import type { Patient } from '@/types';
import { getPatients } from '@/services/patientService';
import { supabase } from '@/lib/supabase'; // to fetch existing record

export default function MarkAttendanceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingRecord, setIsFetchingRecord] = useState(!!id);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  
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

  useEffect(() => {
    if (id) {
      const fetchRecord = async () => {
        const { data } = await supabase.from('attendances').select('*').eq('id', id).single();
        if (data) {
          setSelectedPatientId(data.patient_id);
          setAttendanceDate(data.attendance_date);
          setAttendanceTime(data.attendance_time.substring(0, 5));
          setNotes(data.notes || '');
        }
        setIsFetchingRecord(false);
      };
      fetchRecord();
    }
  }, [id]);

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
    let error;
    if (id) {
      const res = await updateAttendance(id, {
        patient_id: selectedPatientId,
        attendance_date: attendanceDate,
        attendance_time: attendanceTime,
        notes: notes.trim() || null,
      });
      error = res.error;
    } else {
      const res = await createAttendance({
        patient_id: selectedPatientId,
        attendance_date: attendanceDate,
        attendance_time: attendanceTime,
        notes: notes.trim() || null,
      });
      error = res.error;
    }
    
    setIsSubmitting(false);

    if (error) {
      Alert.alert('Error', error);
    } else {
      router.back();
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
      <Stack.Screen options={{ title: id ? 'Edit Attendance' : 'Mark Attendance' }} />

        <KeyboardAwareScrollView 
          style={styles.container} 
          contentContainerStyle={[styles.content, { paddingBottom: Spacing['4xl'] }]} 
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={50}
        >
        
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
            title={id ? 'Save Changes' : 'Mark Attendance'} 
            onPress={handleSubmit} 
            loading={isSubmitting} 
            icon={<Ionicons name={id ? 'save-outline' : 'checkmark-circle-outline'} size={20} color={Colors.textInverse} />} 
          />
        </View>
      </KeyboardAwareScrollView>

    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base },
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.text, marginBottom: Spacing.base },
  submitContainer: { marginTop: Spacing.xl },
});
