import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
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
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [patientId, setPatientId] = useState<string>('');
  const [isPatientModalVisible, setIsPatientModalVisible] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
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
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        <Text style={styles.sectionTitle}>Patient</Text>
        <TouchableOpacity 
          style={[styles.dropdownTrigger, errors.patientId ? styles.dropdownTriggerError : null]} 
          onPress={() => setIsPatientModalVisible(true)}
        >
          <Text style={patientId ? styles.dropdownTriggerText : styles.dropdownTriggerPlaceholder}>
            {patientId ? patients.find(p => p.id === patientId)?.full_name : 'Select a patient...'}
          </Text>
          <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        {errors.patientId && <Text style={styles.errorText}>{errors.patientId}</Text>}

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

      <Modal visible={isPatientModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsPatientModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Patient</Text>
            <TouchableOpacity onPress={() => setIsPatientModalVisible(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalSearchContainer}>
             <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.modalSearchIcon} />
             <TextInput 
               style={styles.modalSearchInput}
               placeholder="Search patients..."
               value={patientSearchQuery}
               onChangeText={setPatientSearchQuery}
               placeholderTextColor={Colors.textTertiary}
             />
          </View>
          {loadingPatients ? (
            <Text style={styles.loadingText}>Loading patients...</Text>
          ) : (
            <FlatList
              data={patients.filter(p => p.full_name.toLowerCase().includes(patientSearchQuery.toLowerCase()))}
              keyExtractor={p => p.id}
              contentContainerStyle={styles.modalListContent}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.modalListItem, patientId === item.id && styles.modalListItemActive]} 
                  onPress={() => {
                    setPatientId(item.id);
                    setIsPatientModalVisible(false);
                    if (errors.patientId) setErrors(prev => ({ ...prev, patientId: '' }));
                  }}
                >
                  <Ionicons name="person-circle-outline" size={24} color={patientId === item.id ? Colors.primary : Colors.textSecondary} />
                  <Text style={[styles.modalListItemText, patientId === item.id && styles.modalListItemTextActive]}>{item.full_name}</Text>
                  {patientId === item.id && <Ionicons name="checkmark" size={20} color={Colors.primary} style={{ marginLeft: 'auto' }} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.loadingText}>No patients found.</Text>}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.text, marginBottom: Spacing.base },
  fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.text, marginBottom: Spacing.sm },
  horizontalScroll: { flexDirection: 'row', marginBottom: Spacing.xs },
  patientChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  patientChipActive: {
    backgroundColor: Colors.primaryFaded, borderColor: Colors.primary,
  },
  patientChipText: { marginLeft: Spacing.xs, fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  patientChipTextActive: { color: Colors.primary },
  loadingText: { fontSize: Typography.sm, color: Colors.textTertiary, fontStyle: 'italic' },
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
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  dropdownTriggerError: {
    borderColor: Colors.error,
  },
  dropdownTriggerText: {
    fontSize: Typography.base,
    color: Colors.text,
  },
  dropdownTriggerPlaceholder: {
    fontSize: Typography.base,
    color: Colors.textTertiary,
  },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, backgroundColor: Colors.surface },
  modalTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.text },
  modalSearchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, margin: Spacing.base, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  modalSearchIcon: { marginRight: Spacing.sm },
  modalSearchInput: { flex: 1, paddingVertical: Spacing.md, fontSize: Typography.base, color: Colors.text },
  modalListContent: { paddingBottom: Spacing['4xl'] },
  modalListItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight, backgroundColor: Colors.surface },
  modalListItemActive: { backgroundColor: Colors.primaryFaded },
  modalListItemText: { fontSize: Typography.base, color: Colors.text, marginLeft: Spacing.md },
  modalListItemTextActive: { color: Colors.primary, fontWeight: Typography.semibold },
});
