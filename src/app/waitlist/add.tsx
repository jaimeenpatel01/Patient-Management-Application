import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createWaitlistEntry } from '@/services/waitlistService';
import { getPatients } from '@/services/offline/patientService.offline';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { PatientSearchPicker } from '@/components/ui/PatientSearchPicker';
import { AppDateTimePicker } from '@/components/ui/DateTimePicker';
import { Button } from '@/components/ui/Button';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { useAlert } from '@/contexts/AlertContext';
import type { Patient } from '@/types';

export default function AddToWaitlistScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [requestedDate, setRequestedDate] = useState('');
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
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !selectedPatientId) return;

    setIsSubmitting(true);
    const { error } = await createWaitlistEntry({
      patient_id: selectedPatientId,
      requested_date: requestedDate || null,
      notes: notes.trim() || null,
    });
    setIsSubmitting(false);

    if (error) {
      showAlert('Error', error);
    } else {
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        router.back();
      }, 1500);
    }
  };

  return (
    <>
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={50}
      >
        <View style={[styles.sectionCard, Shadows.sm]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBg}>
              <Ionicons name="person" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Patient</Text>
          </View>
          <PatientSearchPicker
            patients={patients}
            loading={isLoadingPatients}
            value={selectedPatientId}
            onSelect={(patient) => setSelectedPatientId(patient.id)}
            onClear={() => setSelectedPatientId(null)}
            error={errors.patient}
            placeholder="Select patient"
          />
        </View>

        <View style={[styles.sectionCard, Shadows.sm]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBg}>
              <Ionicons name="hourglass" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Waitlist Details</Text>
          </View>
          <AppDateTimePicker
            label="Requested Date (optional)"
            value={requestedDate}
            onChange={setRequestedDate}
            mode="date"
          />
          <View style={{ marginTop: Spacing.sm }}>
            <Input
              label="Notes"
              placeholder="Reason, preferred time, etc."
              leftIcon="document-text-outline"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              containerStyle={{ marginBottom: 0 }}
            />
          </View>
        </View>

        <View style={styles.submitContainer}>
          <Button
            title="Add to Waitlist"
            onPress={handleSubmit}
            loading={isSubmitting}
            icon={<Ionicons name="hourglass" size={20} color={Colors.textInverse} />}
          />
        </View>
      </KeyboardAwareScrollView>

      <SuccessModal visible={showSuccessModal} message="Patient added to the waitlist." />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  sectionCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text,
  },
  submitContainer: { marginTop: Spacing.xs },
});
