import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createPatient } from '@/services/patientService';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Gender } from '@/types';

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

export default function AddPatientScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (phone && !/^[+]?[\d\s-()]{7,15}$/.test(phone.trim())) {
      newErrors.phone = 'Enter a valid phone number';
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }

    if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
      newErrors.dateOfBirth = 'Use format YYYY-MM-DD';
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
      email: email.trim() || null,
      date_of_birth: dateOfBirth.trim() || null,
      gender: gender,
      address: address.trim() || null,
      emergency_contact: emergencyContact.trim() || null,
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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
          label="Phone Number"
          placeholder="+91 98765 43210"
          leftIcon="call-outline"
          value={phone}
          onChangeText={setPhone}
          error={errors.phone}
          keyboardType="phone-pad"
        />

        <Input
          label="Email"
          placeholder="patient@example.com"
          leftIcon="mail-outline"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          keyboardType="email-address"
        />

        <Input
          label="Date of Birth"
          placeholder="YYYY-MM-DD"
          leftIcon="calendar-outline"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          error={errors.dateOfBirth}
        />

        {/* Gender selector */}
        <Text style={styles.fieldLabel}>Gender</Text>
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

        {/* Additional info */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Additional Information</Text>

        <Input
          label="Address"
          placeholder="Enter address"
          leftIcon="location-outline"
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={2}
        />

        <Input
          label="Emergency Contact"
          placeholder="Name & phone number"
          leftIcon="alert-circle-outline"
          value={emergencyContact}
          onChangeText={setEmergencyContact}
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
      </ScrollView>
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
  submitContainer: {
    marginTop: Spacing.xl,
  },
});
