import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { getPaymentsByPatientId } from '@/services/paymentService';
import type { Payment } from '@/types';

export default function PatientPaymentsScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadPayments = useCallback(async () => {
    if (!patientId) return;
    const { data } = await getPaymentsByPatientId(patientId);
    setPayments(data);
  }, [patientId]);

  React.useEffect(() => {
    loadPayments().finally(() => setIsLoading(false));
  }, [loadPayments]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPayments();
    setIsRefreshing(false);
  };

  const renderPayment = ({ item }: { item: Payment }) => {
    const isPaid = item.status === 'paid';
    const isPending = item.status === 'pending';
    
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
            <View style={[
              styles.statusBadge, 
              isPaid ? styles.statusBadgePaid : 
              isPending ? styles.statusBadgePending : 
              styles.statusBadgeOther
            ]}>
              <Text style={[
                styles.statusText,
                isPaid ? styles.statusTextPaid : 
                isPending ? styles.statusTextPending : 
                styles.statusTextOther
              ]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
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
      </View>
    );
  };

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
  listContent: { padding: Spacing.base, paddingBottom: 100 },
  paymentCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.base,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md, ...Shadows.sm
  },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientInfo: { flex: 1, marginRight: Spacing.md },
  paymentDate: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.text, textTransform: 'capitalize' },
  amountInfo: { alignItems: 'flex-end' },
  amountText: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.text, marginBottom: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  statusBadgePaid: { backgroundColor: Colors.successLight },
  statusBadgePending: { backgroundColor: Colors.warningLight },
  statusBadgeOther: { backgroundColor: Colors.surfaceSecondary },
  statusText: { fontSize: Typography.xs, fontWeight: Typography.bold },
  statusTextPaid: { color: Colors.success },
  statusTextPending: { color: Colors.warning },
  statusTextOther: { color: Colors.textSecondary },
  paymentFooter: { 
    marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  methodText: { fontSize: Typography.xs, color: Colors.textTertiary, fontWeight: Typography.medium },
  notesText: { fontSize: Typography.xs, color: Colors.textTertiary, flex: 1, textAlign: 'right', marginLeft: Spacing.md, fontStyle: 'italic' },
});
