import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createAppointment } from '@/services/appointmentService';
import { getPatients } from '@/services/patientService';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Patient, AppointmentStatus } from '@/types';


const STATUS_OPTIONS: { label: string; value: AppointmentStatus }[] = [
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'No Show', value: 'no_show' },
];

export default function AddAppointmentScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [status, setStatus] = useState<AppointmentStatus>('scheduled');
  const [notes, setNotes] = useState('');
  const [patientSearch, setPatientSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      setLoadingPatients(true);
      getPatients().then((r) => { setPatients(r.data); setLoadingPatients(false); });
    }, [])
  );

  const filteredPatients = patientSearch.trim()
    ? patients.filter((p) => p.full_name.toLowerCase().includes(patientSearch.toLowerCase()))
    : patients;

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!selectedPatientId) e.patient = 'Select a patient';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) e.date = 'Use YYYY-MM-DD';
    if (!/^\d{2}:\d{2}$/.test(appointmentTime)) e.time = 'Use HH:MM (24h)';
    if (!durationMinutes || isNaN(Number(durationMinutes))) e.duration = 'Enter a number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    const { error } = await createAppointment({
      patient_id: selectedPatientId!,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      duration_minutes: parseInt(durationMinutes, 10),
      status,
      notes: notes.trim() || null,
    });
    setIsSubmitting(false);
    if (error) Alert.alert('Error', error);
    else router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'New Appointment' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Patient selector */}
        <Text style={styles.sectionTitle}>Patient</Text>
        {selectedPatient ? (
          <View style={styles.selectedPatient}>
            <Text style={styles.selectedName}>{selectedPatient.full_name}</Text>
            <TouchableOpacity onPress={() => setSelectedPatientId(null)}>
              <Ionicons name="close-circle" size={22} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Input
              placeholder="Search patients..."
              leftIcon="search-outline"
              value={patientSearch}
              onChangeText={setPatientSearch}
              error={errors.patient}
            />
            {loadingPatients ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <View style={styles.patientList}>
                {filteredPatients.slice(0, 5).map((p) => (
                  <TouchableOpacity key={p.id} style={styles.patientOption} onPress={() => { setSelectedPatientId(p.id); setPatientSearch(''); }}>
                    <Text style={styles.patientOptionText}>{p.full_name}</Text>
                    {p.phone && <Text style={styles.patientOptionSub}>{p.phone}</Text>}
                  </TouchableOpacity>
                ))}
                {filteredPatients.length === 0 && <Text style={styles.noResults}>No patients found</Text>}
              </View>
            )}
          </>
        )}

        {/* Appointment details */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>Details</Text>
        <Input label="Date *" placeholder="YYYY-MM-DD" leftIcon="calendar-outline" value={appointmentDate} onChangeText={setAppointmentDate} error={errors.date} />
        <Input label="Time *" placeholder="HH:MM (24h)" leftIcon="time-outline" value={appointmentTime} onChangeText={setAppointmentTime} error={errors.time} />
        <Input label="Duration (minutes)" placeholder="30" leftIcon="hourglass-outline" value={durationMinutes} onChangeText={setDurationMinutes} error={errors.duration} keyboardType="numeric" />

        <Text style={styles.fieldLabel}>Status</Text>
        <View style={styles.chipRow}>
          {STATUS_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.value} style={[styles.chip, status === opt.value && styles.chipActive]} onPress={() => setStatus(opt.value)}>
              <Text style={[styles.chipText, status === opt.value && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input label="Notes" placeholder="Any notes..." leftIcon="document-text-outline" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

        <View style={styles.submitContainer}>
          <Button title="Create Appointment" onPress={handleSubmit} loading={isSubmitting} icon={<Ionicons name="checkmark-circle-outline" size={20} color={Colors.textInverse} />} />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.text, marginBottom: Spacing.sm },
  fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.text, marginBottom: Spacing.sm },
  selectedPatient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primaryFaded, borderRadius: BorderRadius.lg, padding: Spacing.base, borderWidth: 1, borderColor: Colors.primary, marginBottom: Spacing.base,
  },
  selectedName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.primary },
  patientList: { marginBottom: Spacing.sm },
  patientOption: {
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.base,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  patientOptionText: { fontSize: Typography.base, color: Colors.text, fontWeight: Typography.medium },
  patientOptionSub: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  noResults: { fontSize: Typography.sm, color: Colors.textTertiary, textAlign: 'center', paddingVertical: Spacing.base },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.base },
  chip: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.primaryFaded, borderColor: Colors.primary },
  chipText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  chipTextActive: { color: Colors.primary },
  submitContainer: { marginTop: Spacing.xl },
});
