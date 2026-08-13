import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getPatientById, updatePatient } from '@/services/patientService';
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

export default function EditPatientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [visitType, setVisitType] = useState<VisitType | null>(null);
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setIsLoading(true);
      getPatientById(id).then((result) => {
        if (result.error || !result.data) {
          setLoadError(result.error || 'Patient not found');
        } else {
          const p = result.data;
          setFullName(p.full_name);
          setPhone(p.phone || '');
          setDateOfBirth(p.date_of_birth || '');
          setGender(p.gender);
          setVisitType(p.visit_type);
          setAddress(p.address || '');
          setIsActive(p.is_active);
          setNotes(p.notes || '');
        }
        setIsLoading(false);
      });
    }, [id])
  );

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (phone && !/^[+]?[\d\s-()]{7,15}$/.test(phone.trim())) {
      newErrors.phone = 'Enter a valid phone number';
    }

    // AppDateTimePicker ensures correct format, so we can skip manual format check here
    if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
      newErrors.dateOfBirth = 'Use format YYYY-MM-DD';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !id) return;

    setIsSubmitting(true);
    const { error } = await updatePatient(id, {
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      date_of_birth: dateOfBirth.trim() || null,
      gender: gender,
      visit_type: visitType,
      address: address.trim() || null,
      is_active: isActive,
      notes: notes.trim() || null,
    });

    setIsSubmitting(false);

    if (error) {
      Alert.alert('Error', error);
    } else {
      router.back();
    }
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Patient' }} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Patient' }} />
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{loadError}</Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            variant="outline"
            size="sm"
            fullWidth={false}
            style={{ marginTop: Spacing.base }}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Patient' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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

        <AppDateTimePicker
          label="Date of Birth"
          value={dateOfBirth}
          onChange={setDateOfBirth}
          mode="date"
          error={errors.dateOfBirth}
        />

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

        {/* Visit Type selector */}
        <Text style={styles.fieldLabel}>Visit Type</Text>
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

        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Additional Information</Text>

        <View style={styles.toggleRow}>
          <Text style={styles.fieldLabel}>Active Patient</Text>
          <TouchableOpacity 
            style={[styles.toggleButton, isActive ? styles.toggleActive : styles.toggleInactive]}
            onPress={() => setIsActive(!isActive)}
          >
            <View style={[styles.toggleKnob, isActive ? styles.toggleKnobActive : styles.toggleKnobInactive]} />
          </TouchableOpacity>
        </View>

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
          label="Notes"
          placeholder="Any additional notes..."
          leftIcon="document-text-outline"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <View style={styles.submitContainer}>
          <Button
            title="Save Changes"
            onPress={handleSubmit}
            loading={isSubmitting}
            icon={<Ionicons name="checkmark-circle-outline" size={20} color={Colors.textInverse} />}
          />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing['2xl'],
  },
  errorText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    marginTop: Spacing.base,
    textAlign: 'center',
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  toggleButton: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleInactive: {
    backgroundColor: Colors.border,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  toggleKnobInactive: {
    transform: [{ translateX: 0 }],
  },
  submitContainer: {
    marginTop: Spacing.xl,
  },
});
