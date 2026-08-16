import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ChipSelector } from '@/components/ui/ChipSelector';
import { PatientSearchPicker } from '@/components/ui/PatientSearchPicker';
import { PAYMENT_TYPES, PAYMENT_METHODS, PAYMENT_STATUSES } from '@/constants/options';
import { getPatients } from '@/services/patientService';
import { createPayment, updatePayment } from '@/services/paymentService';
import type { Patient, PaymentType, PaymentMethod, PaymentStatus } from '@/types';
import { supabase } from '@/lib/supabase';


export default function AddPaymentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [isFetchingRecord, setIsFetchingRecord] = useState(!!id);
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

  useEffect(() => {
    if (id) {
      const fetchRecord = async () => {
        const { data } = await supabase.from('payments').select('*').eq('id', id).single();
        if (data) {
          setPatientId(data.patient_id);
          setAmount(data.amount.toString());
          setPaymentType(data.payment_type as PaymentType);
          setPaymentMethod((data.payment_method || 'upi') as PaymentMethod);
          setStatus(data.status as PaymentStatus);
          setNotes(data.notes || '');
        }
        setIsFetchingRecord(false);
      };
      fetchRecord();
    }
  }, [id]);

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
    let error;
    if (id) {
      const res = await updatePayment(id, {
        patient_id: patientId,
        amount: Number(amount),
        payment_type: paymentType,
        payment_method: paymentMethod,
        status: status,
        notes: notes.trim() || null,
      });
      error = res.error;
    } else {
      const res = await createPayment({
        patient_id: patientId,
        attendance_id: null,
        amount: Number(amount),
        payment_type: paymentType,
        payment_method: paymentMethod,
        status: status,
        payment_date: new Date().toISOString(),
        notes: notes.trim() || null,
      });
      error = res.error;
    }
    setIsSubmitting(false);

    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('Success', id ? 'Payment updated successfully' : 'Payment recorded successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
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
      <Stack.Screen options={{ title: id ? 'Edit Payment' : 'Record Payment' }} />

        <KeyboardAwareScrollView 
          style={styles.container} 
          contentContainerStyle={[styles.content, { paddingBottom: 48 }]} 
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={50}
        >
          
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
          <ChipSelector options={PAYMENT_TYPES} value={paymentType} onChange={setPaymentType} />

          <View style={styles.spacer} />

          <Text style={styles.fieldLabel}>Payment Method</Text>
          <ChipSelector options={PAYMENT_METHODS} value={paymentMethod} onChange={setPaymentMethod} />

          <View style={styles.spacer} />

          <Text style={styles.fieldLabel}>Status</Text>
          <ChipSelector options={PAYMENT_STATUSES} value={status} onChange={setStatus} />

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
              title={id ? 'Save Changes' : 'Record Payment'}
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
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.text, marginBottom: Spacing.base },
  fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.text, marginBottom: Spacing.sm },
  spacer: { height: Spacing.lg },
  submitContainer: { marginTop: Spacing.xl },
});
