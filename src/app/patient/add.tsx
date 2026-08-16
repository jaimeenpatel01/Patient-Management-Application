import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createPatient } from '@/services/patientService';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ChipSelector } from '@/components/ui/ChipSelector';
import { GENDER_OPTIONS, VISIT_TYPE_OPTIONS } from '@/constants/options';
import { validatePatientForm } from '@/lib/validators';
import type { Gender, VisitType } from '@/types';

export default function AddPatientScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
