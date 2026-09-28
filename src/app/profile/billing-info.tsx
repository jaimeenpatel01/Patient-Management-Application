import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/contexts/AlertContext';
import { updateProfile } from '@/services/profileService';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

export default function BillingInfoScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { showAlert } = useAlert();

  const [clinicName, setClinicName] = useState(profile?.clinic_name ?? '');
  const [clinicAddress, setClinicAddress] = useState(profile?.clinic_address ?? '');
  const [clinicPhone, setClinicPhone] = useState(profile?.clinic_phone ?? '');
  const [gstNumber, setGstNumber] = useState(profile?.gst_number ?? '');
  const [isSaving, setIsSaving] = useState(false);

  // Sync form with profile once it loads (profile may be null on first render)
  useEffect(() => {
    if (!profile) return;
    setClinicName(profile.clinic_name ?? '');
    setClinicAddress(profile.clinic_address ?? '');
    setClinicPhone(profile.clinic_phone ?? '');
    setGstNumber(profile.gst_number ?? '');
  }, [profile?.clinic_name, profile?.clinic_address, profile?.clinic_phone, profile?.gst_number]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    const updates: Record<string, any> = {
      clinic_name: clinicName.trim() || null,
      clinic_address: clinicAddress.trim() || null,
      clinic_phone: clinicPhone.trim() || null,
      gst_number: gstNumber.trim() || null,
    };

    const { error } = await updateProfile(user.id, updates);
    setIsSaving(false);

    if (error) {
      showAlert('Update Failed', error);
    } else {
      await refreshProfile();
      showAlert('Success', 'Your billing information has been updated.');
    }
  };

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid={true}
      extraScrollHeight={50}
      extraHeight={150}
      showsVerticalScrollIndicator={false}
    >
      {/* Form */}
      <View style={[styles.formCard, Shadows.sm]}>
        <Input
          label="Clinic Name"
          leftIcon="business-outline"
          value={clinicName}
          onChangeText={setClinicName}
          placeholder="Enter your clinic name"
          autoCapitalize="words"
        />
        <Input
          label="Clinic Address"
          leftIcon="location-outline"
          value={clinicAddress}
          onChangeText={setClinicAddress}
          placeholder="Enter your clinic address"
          multiline
          numberOfLines={3}
        />
        <Input
          label="Clinic Phone"
          leftIcon="call-outline"
          value={clinicPhone}
          onChangeText={setClinicPhone}
          placeholder="Enter your clinic phone number"
          keyboardType="phone-pad"
        />
        <Input
          label="GST Number"
          leftIcon="receipt-outline"
          value={gstNumber}
          onChangeText={setGstNumber}
          placeholder="Enter your GST number"
          autoCapitalize="characters"
          hint="Shown on generated invoices/receipts"
        />
      </View>

      {/* Save Button */}
      <Button
        title="Save Changes"
        onPress={handleSave}
        loading={isSaving}
        disabled={!user}
        style={{ marginTop: Spacing.lg }}
      />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  formCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    paddingTop: Spacing.lg,
  },
});
