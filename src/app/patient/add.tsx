import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createPatient } from '@/services/patientService';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { AppDateTimePicker } from '@/components/ui/DateTimePicker';
import { Button } from '@/components/ui/Button';
import type { Gender, VisitType } from '@/types';

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' }
];

const VISIT_TYPE_OPTIONS: { label: string; value: VisitType }[] = [
  { label: 'Home Visit', value: 'Home Visit' },
  { label: 'Hospital Visit', value: 'Hospital Visit' },
  { label: 'Doctor\'s Home Visit', value: "Doctor's Home Visit" },
];

export default function AddPatientScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [visitType, setVisitType] = useState<VisitType | null>(null);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(phone.trim())) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }

    if (!dateOfBirth.trim()) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
      newErrors.dateOfBirth = 'Use format YYYY-MM-DD';
    }

    if (!gender) {
      newErrors.gender = 'Gender is required';
    }

    if (!visitType) {
      newErrors.visitType = 'Visit type is required';
    }

    if (!address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    const { error } = await createPatient({
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      date_of_birth: dateOfBirth.trim() || null,
      gender: gender,
      visit_type: visitType,
      address: address.trim() || null,
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
          {/* Required section */}
          <Text style={styles.sectionTitle}>Basic Information</Text>

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

        <AppDateTimePicker
          label="Date of Birth *"
          value={dateOfBirth}
          onChange={setDateOfBirth}
          mode="date"
          error={errors.dateOfBirth}
        />

        {/* Gender selector */}
        <Text style={styles.fieldLabel}>Gender *</Text>
        <View style={styles.genderRow}>
          {GENDER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.genderChip,
                gender === option.value && styles.genderChipActive,
              ]}
              onPress={() => setGender(gender === option.value ? null : option.value)}
            >
              <Text
                style={[
                  styles.genderChipText,
                  gender === option.value && styles.genderChipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}

        {/* Visit Type selector */}
        <Text style={styles.fieldLabel}>Visit Type *</Text>
        <View style={styles.genderRow}>
          {VISIT_TYPE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.genderChip,
                visitType === option.value && styles.genderChipActive,
              ]}
              onPress={() => setVisitType(visitType === option.value ? null : option.value)}
            >
              <Text
                style={[
                  styles.genderChipText,
                  visitType === option.value && styles.genderChipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.visitType && <Text style={styles.errorText}>{errors.visitType}</Text>}

        {/* Additional info */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Additional Information</Text>

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
          label="Notes"
          placeholder="Any additional notes..."
          leftIcon="document-text-outline"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        {/* Submit */}
        <View style={styles.submitContainer}>
          <Button
            title="Add Patient"
            onPress={handleSubmit}
            loading={isSubmitting}
            icon={<Ionicons name="checkmark-circle-outline" size={20} color={Colors.textInverse} />}
          />
        </View>
      </KeyboardAwareScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
  },
  sectionTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: Colors.text,
    marginBottom: Spacing.base,
  },
  fieldLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  genderChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  genderChipActive: {
    backgroundColor: Colors.primaryFaded,
    borderColor: Colors.primary,
  },
  genderChipText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  genderChipTextActive: {
    color: Colors.primary,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.xs,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.base,
    marginLeft: Spacing.xs,
  },
  submitContainer: {
    marginTop: Spacing.xl,
  },
});
