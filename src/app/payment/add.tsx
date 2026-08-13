import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PatientSearchPicker } from '@/components/ui/PatientSearchPicker';
import { getPatients } from '@/services/patientService';
import { createPayment } from '@/services/paymentService';
import type { Patient, PaymentType, PaymentMethod, PaymentStatus } from '@/types';

const PAYMENT_TYPES: { label: string; value: PaymentType }[] = [
  { label: 'Consultation', value: 'consultation' },
  { label: 'Physiotherapy Session', value: 'physiotherapy_session' },
  { label: 'Package', value: 'package' },
  { label: 'Other', value: 'other' },
];

const PAYMENT_METHODS: { label: string; value: PaymentMethod }[] = [
  { label: 'Cash', value: 'cash' },
  { label: 'UPI', value: 'upi' },
  { label: 'Card', value: 'card' },
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Other', value: 'other' },
];

const PAYMENT_STATUSES: { label: string; value: PaymentStatus }[] = [
  { label: 'Paid', value: 'paid' },
  { label: 'Pending', value: 'pending' },
  { label: 'Partially Paid', value: 'partially_paid' },
];

export default function AddPaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [patientId, setPatientId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentType, setPaymentType] = useState<PaymentType>('consultation');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [status, setStatus] = useState<PaymentStatus>('paid');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setLoadingPatients(true);
    const { data, error } = await getPatients();
    if (error) {
      Alert.alert('Error', 'Failed to load patients.');
    } else {
      setPatients(data);
    }
    setLoadingPatients(false);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!patientId) newErrors.patientId = 'Please select a patient';
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    const { error } = await createPayment({
      patient_id: patientId,
      appointment_id: null,
      amount: Number(amount),
      payment_type: paymentType,
      payment_method: paymentMethod,
      status: status,
      payment_date: new Date().toISOString(),
      notes: notes.trim() || null,
    });
    setIsSubmitting(false);

    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('Success', 'Payment recorded successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  };

  // Generic render for chips selection
  const renderChips = <T extends string>(
    options: { label: string; value: T }[], 
    selectedValue: T, 
    onSelect: (val: T) => void
  ) => (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.chip, selectedValue === opt.value && styles.chipActive]}
          onPress={() => onSelect(opt.value)}
        >
          <Text style={[styles.chipText, selectedValue === opt.value && styles.chipTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Record Payment' }} />
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 24, 48) }]}>
        
        <Text style={styles.sectionTitle}>Patient</Text>
        <PatientSearchPicker
          patients={patients}
          loading={loadingPatients}
          value={patientId || null}
          onSelect={(patient) => {
            setPatientId(patient.id);
            if (errors.patientId) setErrors((prev) => ({ ...prev, patientId: '' }));
          }}
          onClear={() => setPatientId('')}
          error={errors.patientId}
        />

        <View style={styles.spacer} />

        <Input
          label="Amount (₹)"
          placeholder="e.g. 500"
          value={amount}
          onChangeText={(val) => {
            setAmount(val);
            if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
          }}
          keyboardType="numeric"
          error={errors.amount}
        />

        <View style={styles.spacer} />

        <Text style={styles.fieldLabel}>Payment Type</Text>
        {renderChips(PAYMENT_TYPES, paymentType, setPaymentType)}

        <View style={styles.spacer} />

        <Text style={styles.fieldLabel}>Payment Method</Text>
        {renderChips(PAYMENT_METHODS, paymentMethod, setPaymentMethod)}

        <View style={styles.spacer} />

        <Text style={styles.fieldLabel}>Status</Text>
        {renderChips(PAYMENT_STATUSES, status, setStatus)}

        <View style={styles.spacer} />

        <Input
          label="Notes (Optional)"
          placeholder="Add any extra details..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <View style={styles.submitContainer}>
          <Button
            title="Record Payment"
            onPress={handleSubmit}
            loading={isSubmitting}
            icon={<Ionicons name="checkmark-circle-outline" size={20} color={Colors.textInverse} />}
          />
        </View>

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.text, marginBottom: Spacing.base },
  fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.text, marginBottom: Spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.primaryFaded, borderColor: Colors.primary },
  chipText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  chipTextActive: { color: Colors.primary },
  spacer: { height: Spacing.lg },
  errorText: { fontSize: Typography.sm, color: Colors.error, marginTop: Spacing.xs },
  submitContainer: { marginTop: Spacing.xl },
});
