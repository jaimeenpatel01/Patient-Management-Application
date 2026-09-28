import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { getMyPatientProfile } from '@/services/patientPortalService';
import { getPaymentsByPatientId } from '@/services/paymentService';
import type { Payment } from '@/types';
import { groupItemsByDate } from '@/lib/formatters';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

function PaymentItem({ item }: { item: Payment }) {
  return (
    <View style={[styles.card, Shadows.sm]}>
      <View style={styles.cardHeader}>
        <Text style={styles.paymentType}>{item.payment_type.replace('_', ' ')}</Text>
        <StatusBadge status={item.status} />
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.amountText}>₹{item.amount.toLocaleString()}</Text>
        {item.payment_method && (
          <Text style={styles.methodText}>{item.payment_method.toUpperCase()}</Text>
        )}
      </View>
      {item.notes && <Text style={styles.notesText}>{item.notes}</Text>}
    </View>
  );
}

export default function PatientPaymentsScreen() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const { data: patient, error: patientError } = await getMyPatientProfile();
    if (!patient) {
      setPayments([]);
      setError(patientError);
      return;
    }
    setError(null);
    const { data } = await getPaymentsByPatientId(patient.id);
    setPayments(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchData().finally(() => setIsLoading(false));
    }, [fetchData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const sections = useMemo(
    () => groupItemsByDate(payments, (p) => p.payment_date),
    [payments]
  );

  if (isLoading) {
    return <LoadingScreen message="Loading your payment history..." />;
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PaymentItem item={item} />}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeaderContainer}>
            <Ionicons name="calendar" size={16} color={Colors.textTertiary} style={{ marginRight: Spacing.sm }} />
            <Text style={styles.sectionHeaderText}>{title}</Text>
            <View style={styles.sectionHeaderLine} />
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No payment history"
            subtitle={error || 'You don’t have any payment records yet.'}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: { padding: Spacing.base, paddingBottom: Spacing['4xl'], flexGrow: 1 },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  sectionHeaderText: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentType: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  amountText: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text,
  },
  methodText: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
    fontWeight: Typography.medium,
  },
  notesText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
  },
});
