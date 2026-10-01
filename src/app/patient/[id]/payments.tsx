import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getPaymentsByPatientId } from '@/services/offline/paymentService.offline';
import { getPatientById } from '@/services/offline/patientService.offline';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/contexts/AlertContext';
import { generateInvoiceHtml, getInvoiceNumber } from '@/lib/invoiceTemplate';
import type { Payment, Patient } from '@/types';

export default function PatientPaymentsScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { showAlert } = useAlert();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadPayments = useCallback(async () => {
    if (!patientId) return;
    const [{ data }, patientRes] = await Promise.all([
      getPaymentsByPatientId(patientId),
      getPatientById(patientId),
    ]);
    setPayments(data);
    if (patientRes.data) setPatient(patientRes.data);
  }, [patientId]);

  const handleGenerateInvoice = async (payment: Payment) => {
    if (!profile) {
      showAlert('Error', 'Profile not loaded. Please try again.');
      return;
    }
    try {
      const html = generateInvoiceHtml(
        payment,
        {
          full_name: patient?.full_name || 'Unknown Patient',
          phone: patient?.phone || undefined,
          address: patient?.address || undefined,
        },
        profile
      );
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `${getInvoiceNumber(payment)} Invoice`,
      });
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to generate invoice.');
    }
  };

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadPayments().finally(() => setIsLoading(false));
    }, [loadPayments])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPayments();
    setIsRefreshing(false);
  };

  const renderPayment = useCallback(({ item }: { item: Payment }) => {
    return (
      <View style={styles.paymentCard}>
        <View style={styles.paymentHeader}>
          <View style={styles.patientInfo}>
            <Text style={styles.paymentDate}>
              {item.payment_date ? new Date(item.payment_date).toLocaleDateString() : 'Unknown Date'} • {item.payment_type.replace('_', ' ')}
            </Text>
          </View>
          <View style={styles.amountInfo}>
            <Text style={styles.amountText}>₹{item.amount.toLocaleString()}</Text>
            <StatusBadge status={item.status} />
          </View>
        </View>
        {(item.notes || item.payment_method) && (
          <View style={styles.paymentFooter}>
            {item.payment_method && (
              <Text style={styles.methodText}>Method: {item.payment_method.toUpperCase()}</Text>
            )}
            {item.notes && (
              <Text style={styles.notesText} numberOfLines={1}>{item.notes}</Text>
            )}
          </View>
        )}
        <TouchableOpacity
          style={styles.invoiceButton}
          onPress={() => handleGenerateInvoice(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
          <Text style={styles.invoiceButtonText}>Generate Invoice</Text>
        </TouchableOpacity>
      </View>
    );
  }, [patient, profile]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Payment History' }} />
      <View style={styles.container}>
        {payments.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="No Payments Found"
            subtitle="This patient doesn't have any payment history yet."
          />
        ) : (
          <FlatList
            data={payments}
            keyExtractor={(item) => item.id}
            renderItem={renderPayment}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: Spacing.base, paddingBottom: Spacing['6xl'] },
  paymentCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.base,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md, ...Shadows.sm
  },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientInfo: { flex: 1, marginRight: Spacing.md },
  paymentDate: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.text, textTransform: 'capitalize' },
  amountInfo: { alignItems: 'flex-end' },
  amountText: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.text, marginBottom: 4 },
  paymentFooter: { 
    marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  methodText: { fontSize: Typography.xs, color: Colors.textTertiary, fontWeight: Typography.medium },
  notesText: { fontSize: Typography.xs, color: Colors.textTertiary, flex: 1, textAlign: 'right', marginLeft: Spacing.md, fontStyle: 'italic' },
  invoiceButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  invoiceButtonText: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.primary },
});
