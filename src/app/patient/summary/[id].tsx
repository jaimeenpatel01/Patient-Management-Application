import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { getPatientById } from '@/services/patientService';
import { getAttendances } from '@/services/attendanceService';
import { getPaymentsByPatientId } from '@/services/paymentService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import type { Patient, Attendance, Payment } from '@/types';
import { useFocusEffect } from 'expo-router';

export default function PatientSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = async () => {
    if (!id) return;
    const pResult = await getPatientById(id);
    if (pResult.data) {
      setPatient(pResult.data);
    }
    const aResult = await getAttendances();
    if (aResult.data) {
      setAttendances(aResult.data.filter(a => a.patient_id === id));
    }
    const payResult = await getPaymentsByPatientId(id);
    if (payResult.data) {
      setPayments(payResult.data);
    }
    // Future expansion: fetch treatments, consultations here
    setIsLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [id])
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Patient not found.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Patient Summary' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.card}>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.borderBottom]}>
                <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Name</Text>
                <Text style={[styles.tableCell, { flex: 2, fontWeight: '500' }]}>{patient.full_name}</Text>
              </View>
              <View style={[styles.tableRow, styles.borderBottom]}>
                <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Status</Text>
                <Text style={[styles.tableCell, { flex: 2 }, patient.is_active ? styles.activeText : styles.inactiveText]}>
                  {patient.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
              {patient.visit_type && (
                <View style={[styles.tableRow, styles.borderBottom]}>
                  <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Visit Type</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{patient.visit_type}</Text>
                </View>
              )}
              <View style={[styles.tableRow, styles.borderBottom]}>
                <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Phone</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{patient.phone || 'N/A'}</Text>
              </View>
              <View style={[styles.tableRow, styles.borderBottom]}>
                <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>DOB</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{patient.date_of_birth || 'N/A'}</Text>
              </View>
              <View style={[styles.tableRow, styles.borderBottom]}>
                <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Gender</Text>
                <Text style={[styles.tableCell, { flex: 2, textTransform: 'capitalize' }]}>{patient.gender || 'N/A'}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Address</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{patient.address || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Attendance History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance History ({attendances.length})</Text>
          <View style={styles.card}>
            {attendances.length === 0 ? (
              <Text style={styles.emptyText}>No attendance records found.</Text>
            ) : (
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.5 }]}>Date</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Day</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Time</Text>
                </View>
                {attendances.map((a, i) => {
                  const dateObj = new Date(a.attendance_date);
                  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                  return (
                    <View key={a.id} style={[styles.tableRow, i !== attendances.length - 1 && styles.borderBottom]}>
                      <Text style={[styles.tableCell, { flex: 1.5 }]}>{a.attendance_date}</Text>
                      <Text style={[styles.tableCell, { flex: 1 }]}>{dayName}</Text>
                      <Text style={[styles.tableCell, { flex: 1 }]}>{a.attendance_time.substring(0, 5)}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Payment History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment History ({payments.length})</Text>
          <View style={styles.card}>
            {payments.length === 0 ? (
              <Text style={styles.emptyText}>No payment records found.</Text>
            ) : (
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.2 }]}>Date</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.5 }]}>Type</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Amount</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1 }]}>Status</Text>
                </View>
                {payments.map((p, i) => {
                  return (
                    <View key={p.id} style={[styles.tableRow, i !== payments.length - 1 && styles.borderBottom]}>
                      <Text style={[styles.tableCell, { flex: 1.2 }]}>{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'N/A'}</Text>
                      <Text style={[styles.tableCell, { flex: 1.5, textTransform: 'capitalize' }]}>{p.payment_type.replace('_', ' ')}</Text>
                      <Text style={[styles.tableCell, { flex: 1 }]}>₹{p.amount}</Text>
                      <Text style={[styles.tableCell, { flex: 1, textTransform: 'uppercase', fontWeight: 'bold', fontSize: 10 }, p.status === 'paid' ? { color: Colors.success } : { color: Colors.warning }]}>{p.status}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
        
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.primary, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.surface, padding: Spacing.base, borderRadius: BorderRadius.lg, ...Shadows.sm },
  label: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: 4 },
  value: { fontSize: Typography.base, color: Colors.text, fontWeight: Typography.medium },
  activeText: { fontSize: Typography.base, color: Colors.success, fontWeight: Typography.bold },
  inactiveText: { fontSize: Typography.base, color: Colors.textTertiary, fontWeight: Typography.bold },
  emptyText: { fontStyle: 'italic', color: Colors.textTertiary },
  historyRow: { paddingVertical: Spacing.sm },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  historyDate: { fontWeight: Typography.semibold, color: Colors.text },
  historyNotes: { color: Colors.textSecondary, fontSize: Typography.sm, marginTop: 2 },
  errorText: { color: Colors.error, fontSize: Typography.lg },
  table: { width: '100%' },
  tableRow: { flexDirection: 'row', paddingVertical: Spacing.sm, alignItems: 'center' },
  tableHeader: { borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: Spacing.xs, paddingBottom: Spacing.sm },
  tableHeaderText: { fontWeight: Typography.bold, color: Colors.textSecondary },
  tableCell: { fontSize: Typography.sm, color: Colors.text },
});
