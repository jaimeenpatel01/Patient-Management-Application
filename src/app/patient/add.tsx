import { Button } from '@/components/ui/Button';
import { ChipSelector } from '@/components/ui/ChipSelector';
import { Input } from '@/components/ui/Input';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { GENDER_OPTIONS, VISIT_TYPE_OPTIONS } from '@/constants/options';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAlert } from '@/contexts/AlertContext';
import { validatePatientForm } from '@/lib/validators';
import { createPatient } from '@/services/patientService';
import type { Gender, VisitType } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

export default function AddPatientScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [visitType, setVisitType] = useState<VisitType | null>(null);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const validate = (): boolean => {
    const newErrors = validatePatientForm({ fullName, phone, age, gender, visitType, address });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    const { error } = await createPatient({
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      age: age.trim() ? parseInt(age.trim(), 10) : null,
      gender: gender,
      visit_type: visitType,
      address: address.trim() || null,
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
      <Stack.Screen options={{ title: 'Add Patient' }} />
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={50}
        extraHeight={150}
      >
        <View style={[styles.sectionCard, Shadows.sm]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBg}>
              <Ionicons name="person" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Basic Information</Text>
          </View>

          <Input
            label="Full Name *"
            placeholder="Enter patient full name"
            leftIcon="person-outline"
            value={fullName}
            onChangeText={setFullName}
            error={errors.fullName}
            autoCapitalize="words"
          />

          <Input
            label="Phone Number *"
            placeholder="9876543210"
            leftIcon="call-outline"
            value={phone}
            onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, '').slice(0, 10))}
            error={errors.phone}
            keyboardType="phone-pad"
            maxLength={10}
          />

          <Input
            label="Age *"
            placeholder="e.g. 35"
            leftIcon="calendar-outline"
            value={age}
            onChangeText={(text) => setAge(text.replace(/[^0-9]/g, '').slice(0, 3))}
            error={errors.age}
            keyboardType="number-pad"
            maxLength={3}
          />

          <Text style={styles.fieldLabel}>Gender *</Text>
          <ChipSelector
            options={GENDER_OPTIONS}
            value={gender}
            onChange={setGender}
            allowDeselect
          />
          {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}

          <Text style={styles.fieldLabel}>Visit Type *</Text>
          <ChipSelector
            options={VISIT_TYPE_OPTIONS}
            value={visitType}
            onChange={setVisitType}
            allowDeselect
          />
          {errors.visitType && <Text style={styles.errorText}>{errors.visitType}</Text>}
        </View>

        <View style={[styles.sectionCard, Shadows.sm]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBg}>
              <Ionicons name="information-circle" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Additional Details</Text>
          </View>

          <Input
            label="Full Address *"
            placeholder="Enter patient's full address"
            leftIcon="location-outline"
            value={address}
            onChangeText={setAddress}
            error={errors.address}
            multiline
            numberOfLines={2}
          />

          <Input
            label="Notes (Optional)"
            placeholder="Any additional notes..."
            leftIcon="document-text-outline"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.submitContainer}>
          <Button
            title="Add Patient"
            onPress={handleSubmit}
            loading={isSubmitting}
            icon={<Ionicons name="checkmark-circle" size={20} color={Colors.textInverse} />}
          />
        </View>
      </KeyboardAwareScrollView>

      <SuccessModal
        visible={showSuccessModal}
        message="Patient added successfully."
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
    fontWeight: Typography.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.xs,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.base,
    marginLeft: Spacing.xs,
  },
  submitContainer: {
    marginTop: Spacing.sm,
  },
});
