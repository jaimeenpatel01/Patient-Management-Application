import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter, Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  createAppointmentSeries,
  updateAppointment,
  getAppointmentById,
} from '@/services/offline/appointmentService.offline';
import { getPatients } from '@/services/offline/patientService.offline';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { PatientSearchPicker } from '@/components/ui/PatientSearchPicker';
import { AppDateTimePicker } from '@/components/ui/DateTimePicker';
import { ChipSelector } from '@/components/ui/ChipSelector';
import { Button } from '@/components/ui/Button';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { useAlert } from '@/contexts/AlertContext';
import { validateAppointmentForm } from '@/lib/validators';
import type { Patient, RecurrenceEndType, RecurrenceFrequency } from '@/types';
import { toLocalDateString } from '@/lib/formatters';

const FREQUENCY_OPTIONS: { label: string; value: RecurrenceFrequency }[] = [
  { label: 'One-time', value: 'one_off' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Biweekly', value: 'biweekly' },
  { label: 'Monthly', value: 'monthly' },
];

const END_TYPE_OPTIONS: { label: string; value: RecurrenceEndType }[] = [
  { label: 'After N sessions', value: 'occurrences' },
  { label: 'On a date', value: 'end_date' },
  { label: 'Ongoing', value: 'ongoing' },
];

const DURATION_OPTIONS: { label: string; value: string }[] = [
  { label: '15 min', value: '15' },
  { label: '30 min', value: '30' },
  { label: '45 min', value: '45' },
  { label: '60 min', value: '60' },
];

const WEEKDAYS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

function WeekdayPicker({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  const toggle = (day: number) => {
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort());
  };

  return (
    <View style={styles.weekdayRow}>
      {WEEKDAYS.map((day) => {
        const isActive = value.includes(day.value);
        return (
          <TouchableOpacity
            key={day.value}
            style={[styles.weekdayChip, isActive && styles.weekdayChipActive]}
            onPress={() => toggle(day.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.weekdayChipText, isActive && styles.weekdayChipTextActive]}>{day.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AppointmentFormScreen() {
  const router = useRouter();
  const { id, patientId: initialPatientId } = useLocalSearchParams<{ id?: string; patientId?: string }>();
  const { showAlert } = useAlert();
  const isEditMode = !!id;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingRecord, setIsFetchingRecord] = useState(isEditMode);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId ?? null);
  const [date, setDate] = useState(toLocalDateString(new Date()));

  const now = new Date();
  const [time, setTime] = useState(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  const [duration, setDuration] = useState('30');
  const [notes, setNotes] = useState('');

  const [frequency, setFrequency] = useState<RecurrenceFrequency>('one_off');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [endType, setEndType] = useState<RecurrenceEndType | null>(null);
  const [endDate, setEndDate] = useState('');
  const [occurrencesCount, setOccurrencesCount] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      getPatients().then((result) => {
        if (result.data) setPatients(result.data);
        setIsLoadingPatients(false);
      });
    }, [])
  );

  useEffect(() => {
    if (id) {
      const fetchRecord = async () => {
        const { data } = await getAppointmentById(id);
        if (data) {
          setSelectedPatientId(data.patient_id);
          setDate(data.appointment_date);
          setTime(data.appointment_time.substring(0, 5));
          setDuration(String(data.duration_minutes));
          setNotes(data.notes || '');
        }
        setIsFetchingRecord(false);
      };
      fetchRecord();
    }
  }, [id]);

  const handleSubmit = async () => {
    if (id) {
      const e: Record<string, string> = {};
      if (!selectedPatientId) e.patient = 'Select a patient';
      if (!date) e.date = 'Date is required';
      if (!time) e.time = 'Time is required';
      setErrors(e);
      if (Object.keys(e).length > 0) return;

      setIsSubmitting(true);
      const { error } = await updateAppointment(id, {
        patient_id: selectedPatientId!,
        appointment_date: date,
        appointment_time: time,
        duration_minutes: Number(duration),
        notes: notes.trim() || null,
      });
      setIsSubmitting(false);

      if (error) {
        showAlert('Error', error);
        return;
      }
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        router.back();
      }, 1500);
      return;
    }

    const validationErrors = validateAppointmentForm({
      patientId: selectedPatientId,
      date,
      time,
      frequency,
      daysOfWeek,
      endType,
      endDate,
      occurrencesCount,
    });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    const { error } = await createAppointmentSeries({
      patient_id: selectedPatientId!,
      start_date: date,
      start_time: time,
      duration_minutes: Number(duration),
      frequency,
      days_of_week: frequency === 'weekly' || frequency === 'biweekly' ? daysOfWeek : null,
      end_type: frequency === 'one_off' ? 'occurrences' : endType!,
      end_date: frequency !== 'one_off' && endType === 'end_date' ? endDate : null,
      occurrences_count: frequency === 'one_off' ? 1 : endType === 'occurrences' ? Number(occurrencesCount) : null,
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

  if (isFetchingRecord) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: isEditMode ? 'Edit Appointment' : 'New Appointment' }} />
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
              <Ionicons name="time" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>{isEditMode ? 'Date & Time' : 'Schedule'}</Text>
          </View>
          <AppDateTimePicker label="Date *" value={date} onChange={setDate} mode="date" error={errors.date} />
          <AppDateTimePicker label="Time *" value={time} onChange={setTime} mode="time" error={errors.time} />

          <Text style={styles.fieldLabel}>Session Duration</Text>
          <ChipSelector options={DURATION_OPTIONS} value={duration} onChange={setDuration} />

          {isEditMode && (
            <View style={styles.editHint}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.editHintText}>
                This only changes this appointment. To cancel the whole recurring schedule, use the list screen&apos;s menu instead.
              </Text>
            </View>
          )}

          {!isEditMode && (
            <>
              <Text style={styles.fieldLabel}>Repeats</Text>
              <ChipSelector options={FREQUENCY_OPTIONS} value={frequency} onChange={setFrequency} />
              {errors.frequency && <Text style={styles.errorText}>{errors.frequency}</Text>}

              {(frequency === 'weekly' || frequency === 'biweekly') && (
                <>
                  <Text style={styles.fieldLabel}>On These Days</Text>
                  <WeekdayPicker value={daysOfWeek} onChange={setDaysOfWeek} />
                  {errors.daysOfWeek && <Text style={styles.errorText}>{errors.daysOfWeek}</Text>}
                </>
              )}
            </>
          )}
        </View>

        {!isEditMode && frequency !== 'one_off' && (
          <View style={[styles.sectionCard, Shadows.sm]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBg}>
                <Ionicons name="flag" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Ends</Text>
            </View>
            <ChipSelector options={END_TYPE_OPTIONS} value={endType} onChange={setEndType} />
            {errors.endType && <Text style={styles.errorText}>{errors.endType}</Text>}

            {endType === 'occurrences' && (
              <Input
                label="Number of Sessions"
                placeholder="e.g. 10"
                leftIcon="repeat-outline"
                value={occurrencesCount}
                onChangeText={setOccurrencesCount}
                keyboardType="number-pad"
                error={errors.occurrencesCount}
                containerStyle={{ marginBottom: 0 }}
              />
            )}

            {endType === 'end_date' && (
              <AppDateTimePicker label="End Date" value={endDate} onChange={setEndDate} mode="date" error={errors.endDate} />
            )}
          </View>
        )}

        <View style={[styles.sectionCard, Shadows.sm]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBg}>
              <Ionicons name="document-text" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Notes</Text>
          </View>
          <Input
            placeholder="Optional notes..."
            leftIcon="document-text-outline"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            containerStyle={{ marginBottom: 0 }}
          />
        </View>

        <View style={styles.submitContainer}>
          <Button
            title={isEditMode ? 'Save Changes' : 'Create Appointment'}
            onPress={handleSubmit}
            loading={isSubmitting}
            icon={<Ionicons name={isEditMode ? 'save' : 'calendar'} size={20} color={Colors.textInverse} />}
          />
        </View>
      </KeyboardAwareScrollView>

      <SuccessModal
        visible={showSuccessModal}
        message={isEditMode ? 'Appointment updated successfully.' : 'Appointment scheduled successfully.'}
      />
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
  fieldLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  errorText: {
    fontSize: Typography.xs,
    color: Colors.error,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
  },
  weekdayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  weekdayChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekdayChipActive: {
    backgroundColor: Colors.primaryFaded,
    borderColor: Colors.primary,
  },
  weekdayChipText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  weekdayChipTextActive: {
    color: Colors.primary,
    fontWeight: Typography.semibold,
  },
  editHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  editHintText: {
    flex: 1,
    fontSize: Typography.xs,
    color: Colors.textSecondary,
  },
  submitContainer: { marginTop: Spacing.xs },
});
