import React, { useState, useCallback, memo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '@/contexts/AlertContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getPayments, deletePayment, getRevenueStatistics, PaymentWithPatient, RevenueStats } from '@/services/paymentService';

export default function PaymentsScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [payments, setPayments] = useState<PaymentWithPatient[]>([]);
  const [stats, setStats] = useState<RevenueStats>({ totalPaid: 0, totalPending: 0, thisMonthPaid: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const fetchData = async () => {
    const [paymentsRes, statsRes] = await Promise.all([
      getPayments(),
      getRevenueStatistics()
    ]);

    if (!paymentsRes.error) {
      setPayments(paymentsRes.data);
    }
    if (!statsRes.error) {
      setStats(statsRes.data);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleDelete = (id: string) => {
    showAlert('Delete Payment', 'Are you sure you want to delete this payment record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePayment(id);
          fetchData();
        },
      },
    ]);
  };

  const renderHeader = () => (
    <View style={styles.dashboardContainer}>
      <Text style={styles.dashboardTitle}>Revenue Dashboard</Text>
      
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: Colors.primary }, Shadows.md]}>
          <Ionicons name="wallet" size={28} color={Colors.textInverse} style={styles.statIcon} />
          <Text style={styles.statLabelInverse}>Total Paid</Text>
          <Text style={styles.statValueInverse}>₹{stats.totalPaid.toLocaleString()}</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: Colors.warning }, Shadows.md]}>
          <Ionicons name="time" size={28} color={Colors.textInverse} style={styles.statIcon} />
          <Text style={styles.statLabelInverse}>Pending</Text>
          <Text style={styles.statValueInverse}>₹{stats.totalPending.toLocaleString()}</Text>
        </View>
      </View>

      <View style={[styles.monthlyStatCard, Shadows.md]}>
        <View style={styles.monthlyStatHeader}>
          <View style={styles.monthlyIconBg}>
            <Ionicons name="calendar" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.monthlyStatLabel}>This Month (Paid)</Text>
        </View>
        <Text style={styles.monthlyStatValue}>₹{stats.thisMonthPaid.toLocaleString()}</Text>
      </View>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>
    </View>
  );

  const PaymentItem = memo(({ item }: { item: PaymentWithPatient }) => {
    const isPaid = item.status === 'paid';
    return (
      <View style={[styles.paymentCard, Shadows.md]}>
        <View style={[styles.paymentAccent, { backgroundColor: isPaid ? Colors.success : Colors.warning }]} />
        <View style={styles.paymentContent}>
          <View style={styles.paymentHeader}>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName} numberOfLines={1}>{item.patient?.full_name || 'Unknown Patient'}</Text>
              <Text style={styles.paymentDate}>
                {item.payment_date ? new Date(item.payment_date).toLocaleDateString() : 'Unknown Date'} • {item.payment_type.replace('_', ' ')}
              </Text>
            </View>
            <View style={styles.amountInfo}>
              <Text style={styles.amountText}>₹{item.amount.toLocaleString()}</Text>
              <StatusBadge status={item.status} />
            </View>
          </View>
          
          <View style={styles.paymentFooter}>
            <View style={styles.footerLeft}>
              {item.payment_method && (
                <Text style={styles.methodText}>Method: {item.payment_method.toUpperCase()}</Text>
              )}
              {item.notes && (
                <Text style={styles.notesText} numberOfLines={1}>{item.notes}</Text>
              )}
            </View>
            <View style={styles.actionsContainer}>
              <TouchableOpacity onPress={() => setActiveActionId(item.id)} style={styles.actionBtn}>
                <Ionicons name="ellipsis-vertical" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  });
  PaymentItem.displayName = 'PaymentItem';

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PaymentItem item={item} />}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No Transactions"
            subtitle="You haven't recorded any payments yet."
          />
        }
      />
      
      <ActionMenu
        visible={!!activeActionId}
        onClose={() => setActiveActionId(null)}
        options={[
          {
            label: 'Edit',
            icon: 'pencil',
            color: Colors.primary,
            onPress: () => {
              const id = activeActionId;
              setActiveActionId(null);
              if (id) router.push(`/payment/add?id=${id}` as any);
            },
          },
          {
            label: 'Delete',
            icon: 'trash',
            color: Colors.error,
            onPress: () => {
              const id = activeActionId;
              setActiveActionId(null);
              if (id) handleDelete(id);
            },
          },
        ]}
      />

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/payment/add' as any)}
      >
        <Ionicons name="add" size={30} color={Colors.textInverse} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  listContent: { padding: Spacing.base, paddingBottom: Spacing['6xl'], paddingTop: Spacing.md },
  
  dashboardContainer: { marginBottom: Spacing.xl },
  dashboardTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.text, marginBottom: Spacing.md },
  
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  statCard: { 
    flex: 1, borderRadius: BorderRadius.xl, padding: Spacing.xl, 
    justifyContent: 'space-between',
  },
  statIcon: { marginBottom: Spacing.sm },
  statLabelInverse: { fontSize: Typography.sm, color: Colors.textInverse, opacity: 0.9, marginBottom: 4, fontWeight: Typography.medium },
  statValueInverse: { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.textInverse },
  
  monthlyStatCard: {
    backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.xl, padding: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.xl, borderWidth: 0
  },
  monthlyStatHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  monthlyIconBg: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryFaded, justifyContent: 'center', alignItems: 'center' },
  monthlyStatLabel: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.text },
  monthlyStatValue: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.primary },
  
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.text, marginBottom: Spacing.sm },
  
  paymentCard: {
    backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.xl,
    flexDirection: 'row', overflow: 'hidden', marginBottom: Spacing.md, borderWidth: 0
  },
  paymentAccent: { width: 6 },
  paymentContent: { flex: 1, padding: Spacing.base },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientInfo: { flex: 1, marginRight: Spacing.md },
  patientName: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.text, marginBottom: 4 },
  paymentDate: { fontSize: Typography.xs, color: Colors.textSecondary, textTransform: 'capitalize', fontWeight: Typography.medium },
  
  amountInfo: { alignItems: 'flex-end' },
  amountText: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.text, marginBottom: 6 },
  
  paymentFooter: { 
    marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  footerLeft: { flex: 1, marginRight: Spacing.md },
  methodText: { fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: Typography.medium, marginBottom: 2 },
  notesText: { fontSize: Typography.xs, color: Colors.textSecondary, fontStyle: 'italic' },
  actionsContainer: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: Spacing.xs, marginLeft: Spacing.sm },
  
  fab: {
    position: 'absolute', bottom: Spacing.xl, right: Spacing.xl,
    width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', ...Shadows.xl,
  },
});
