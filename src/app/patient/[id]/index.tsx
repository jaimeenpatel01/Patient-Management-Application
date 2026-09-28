import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { getPatientById, deletePatient } from '@/services/offline/patientService.offline';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getInitials } from '@/lib/formatters';
import type { Patient } from '@/types';
import { useAlert } from '@/contexts/AlertContext';



function getGenderDisplay(gender: string | null): string {
  if (!gender) return 'Not specified';
  const labels: Record<string, string> = {
    male: 'Male',
    female: 'Female',
    other: 'Other',
    prefer_not_to_say: 'Prefer not to say',
  };
  return labels[gender] || gender;
}


function InfoRow({ icon, label, value, copyable }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string | null, copyable?: boolean }) {
  const { showAlert } = useAlert();
  const handleCopy = async () => {
    if (value) {
      await Clipboard.setStringAsync(value);
      showAlert('Copied', `${label} copied to clipboard.`, [{ text: 'OK', style: 'cancel' }]);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.infoRow} 
      onPress={copyable ? handleCopy : undefined} 
      disabled={!copyable}
      activeOpacity={0.6}
    >
      <View style={styles.infoIconContainer}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
      </View>
      {copyable && value ? (
        <Ionicons name="copy-outline" size={16} color={Colors.textTertiary} style={{ alignSelf: 'center', marginLeft: Spacing.sm }} />
      ) : null}
    </TouchableOpacity>
  );
}

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showAlert } = useAlert();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      getPatientById(id).then((result) => {
        if (result.error) {
          setError(result.error);
        } else {
          setPatient(result.data);
        }
        setIsLoading(false);
      });
    }, [id])
  );

  const handleCopyInviteCode = async () => {
    if (!patient?.invite_code) return;
    await Clipboard.setStringAsync(patient.invite_code);
    showAlert('Copied', 'Invite code copied to clipboard.', [{ text: 'OK', style: 'cancel' }]);
  };

  const handleDelete = () => {
    showAlert(
      'Delete Patient',
      `Are you sure you want to delete ${patient?.full_name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            const { error: delError } = await deletePatient(id);
            if (delError) {
              showAlert('Error', delError);
            } else {
              router.back();
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Patient' }} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </>
    );
  }

  if (error || !patient) {
    return (
      <>
        <Stack.Screen options={{ title: 'Patient' }} />
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>Could not load patient</Text>
          <Text style={styles.errorMessage}>{error || 'Patient not found'}</Text>
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

  const ageDisplay = patient.age !== null && patient.age !== undefined ? `${patient.age} years` : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: patient.full_name,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(`/patient/edit/${patient.id}` as any)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="create-outline" size={24} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <View style={styles.headerCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{getInitials(patient.full_name)}</Text>
          </View>
          <Text style={styles.patientName}>{patient.full_name}</Text>
          <View style={styles.statusBadge}>
            <StatusBadge status={patient.is_active ? 'active' : 'inactive'} />
          </View>
          {ageDisplay && (
            <Text style={styles.patientAge}>
              {ageDisplay} • {getGenderDisplay(patient.gender)}
            </Text>
          )}
          {!ageDisplay && (
            <Text style={styles.patientAge}>{getGenderDisplay(patient.gender)}</Text>
          )}
        </View>

        {/* Contact information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="call-outline" label="Phone" value={patient.phone} copyable={true} />
            <InfoRow icon="location-outline" label="Address" value={patient.address} copyable={true} />
          </View>
        </View>

        {/* Patient portal access */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Portal</Text>
          <View style={styles.infoCard}>
            {patient.user_id ? (
              <View style={styles.portalActiveRow}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <Text style={styles.portalActiveText}>Portal access: active</Text>
              </View>
            ) : (
              <>
                <Text style={styles.portalHint}>
                  Share this code with the patient so they can access their portal
                </Text>
                <View style={styles.inviteCodeRow}>
                  <Text style={styles.inviteCodeText}>{patient.invite_code}</Text>
                  <Button
                    title="Copy"
                    onPress={handleCopyInviteCode}
                    variant="outline"
                    size="sm"
                    fullWidth={false}
                    icon={<Ionicons name="copy-outline" size={16} color={Colors.primary} style={{ marginRight: Spacing.xs }} />}
                  />
                </View>
              </>
            )}
          </View>
        </View>

        {/* Medical details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Details</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="calendar-outline" label="Age" value={patient.age !== null && patient.age !== undefined ? patient.age.toString() : null} />
            <InfoRow icon="person-outline" label="Gender" value={getGenderDisplay(patient.gender)} />
            <InfoRow icon="home-outline" label="Visit Type" value={patient.visit_type} />
          </View>
        </View>

        {/* Medical Records Link */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Records</Text>
          <TouchableOpacity 
            style={styles.recordsButton}
            onPress={() => router.push(`/patient/${patient.id}/consultations` as any)}
            activeOpacity={0.7}
          >
            <View style={styles.recordsIconContainer}>
              <Ionicons name="medical-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.recordsTextContainer}>
              <Text style={styles.recordsTitle}>Consultations & Records</Text>
              <Text style={styles.recordsSubtitle}>View history, diagnoses, and treatments</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Generate Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Summary</Text>
          <TouchableOpacity 
            style={styles.recordsButton}
            onPress={() => router.push(`/patient/summary/${patient.id}` as any)}
            activeOpacity={0.7}
          >
            <View style={styles.recordsIconContainer}>
              <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.recordsTextContainer}>
              <Text style={styles.recordsTitle}>Generate Summary</Text>
              <Text style={styles.recordsSubtitle}>View and export complete patient history</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>


        {/* Documents & Media Link */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents & Media</Text>
          <TouchableOpacity 
            style={styles.recordsButton}
            onPress={() => router.push(`/patient/${patient.id}/documents` as any)}
            activeOpacity={0.7}
          >
            <View style={styles.recordsIconContainer}>
              <Ionicons name="images-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.recordsTextContainer}>
              <Text style={styles.recordsTitle}>Files & Uploads</Text>
              <Text style={styles.recordsSubtitle}>X-Rays, MRI scans, and reports</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Notes */}
        {patient.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{patient.notes}</Text>
            </View>
          </View>
        )}

        {/* Record info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Record</Text>
          <View style={styles.infoCard}>
            <InfoRow
              icon="time-outline"
              label="Created"
              value={new Date(patient.created_at).toLocaleDateString()}
            />
            <InfoRow
              icon="refresh-outline"
              label="Last Updated"
              value={new Date(patient.updated_at).toLocaleDateString()}
            />
          </View>
        </View>

        {/* Delete button */}
        <View style={styles.dangerZone}>
          <Button
            title="Delete Patient"
            onPress={handleDelete}
            variant="danger"
            icon={<Ionicons name="trash-outline" size={18} color={Colors.textInverse} />}
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
    paddingBottom: Spacing['4xl'],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing['2xl'],
  },
  errorTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: Colors.text,
    marginTop: Spacing.base,
  },
  errorMessage: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  headerCard: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarLargeText: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.primary,
  },
  patientName: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.text,
  },
  patientAge: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  statusBadge: {
    marginTop: Spacing.sm,
  },
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.base,
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    fontWeight: Typography.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: Typography.base,
    color: Colors.text,
    marginTop: 2,
  },
  portalActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  portalActiveText: {
    fontSize: Typography.base,
    fontWeight: Typography.medium,
    color: Colors.success,
  },
  portalHint: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  inviteCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  inviteCodeText: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text,
    letterSpacing: 2,
  },
  notesCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadows.sm,
  },
  notesText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    lineHeight: Typography.base * Typography.relaxed,
  },
  dangerZone: {
    marginTop: Spacing['2xl'],
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  recordsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadows.sm,
  },
  recordsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  recordsTextContainer: {
    flex: 1,
  },
  recordsTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text,
  },
  recordsSubtitle: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
