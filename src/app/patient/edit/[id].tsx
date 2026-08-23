import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '@/contexts/AlertContext';
import { getPatientById, updatePatient } from '@/services/patientService';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ChipSelector } from '@/components/ui/ChipSelector';
import { GENDER_OPTIONS, VISIT_TYPE_OPTIONS } from '@/constants/options';
import { validatePatientForm } from '@/lib/validators';
import type { Gender, VisitType } from '@/types';

export default function EditPatientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showAlert } = useAlert();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [visitType, setVisitType] = useState<VisitType | null>(null);
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      getPatientById(id).then((result) => {
        if (result.error || !result.data) {
          setLoadError(result.error || 'Patient not found');
        } else {
          const p = result.data;
          setFullName(p.full_name);
          setPhone(p.phone || '');
          setAge(p.age?.toString() || '');
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
    const newErrors = validatePatientForm({ fullName, phone, age, gender, visitType, address });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !id) return;

    setIsSubmitting(true);
    const { error } = await updatePatient(id, {
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      age: age.trim() ? parseInt(age.trim(), 10) : null,
      gender: gender,
      visit_type: visitType,
      address: address.trim() || null,
      is_active: isActive,
      notes: notes.trim() || null,
    });

    setIsSubmitting(false);

    if (error) {
      showAlert('Error', error);
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
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={50}
        extraHeight={150}
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

        {/* Gender selector */}
        <Text style={styles.fieldLabel}>Gender *</Text>
        <ChipSelector
          options={GENDER_OPTIONS}
          value={gender}
          onChange={setGender}
          allowDeselect
        />
        {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}

        {/* Visit Type selector */}
        <Text style={styles.fieldLabel}>Visit Type *</Text>
        <ChipSelector
          options={VISIT_TYPE_OPTIONS}
          value={visitType}
          onChange={setVisitType}
          allowDeselect
        />
        {errors.visitType && <Text style={styles.errorText}>{errors.visitType}</Text>}

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

        <View style={styles.submitContainer}>
          <Button
            title="Save Changes"
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
