import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { getPayments, getRevenueStatistics, PaymentWithPatient, RevenueStats } from '@/services/paymentService';

export default function PaymentsScreen() {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentWithPatient[]>([]);
  const [stats, setStats] = useState<RevenueStats>({ totalPaid: 0, totalPending: 0, thisMonthPaid: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const renderHeader = () => (
    <View style={styles.dashboardContainer}>
      <Text style={styles.dashboardTitle}>Revenue Dashboard</Text>
      
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: Colors.primary }]}>
          <Ionicons name="wallet-outline" size={24} color={Colors.textInverse} style={styles.statIcon} />
          <Text style={styles.statLabelInverse}>Total Paid</Text>
          <Text style={styles.statValueInverse}>₹{stats.totalPaid.toLocaleString()}</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: Colors.warning }]}>
          <Ionicons name="time-outline" size={24} color={Colors.textInverse} style={styles.statIcon} />
          <Text style={styles.statLabelInverse}>Pending</Text>
          <Text style={styles.statValueInverse}>₹{stats.totalPending.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.monthlyStatCard}>
        <View style={styles.monthlyStatHeader}>
          <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          <Text style={styles.monthlyStatLabel}>This Month (Paid)</Text>
        </View>
        <Text style={styles.monthlyStatValue}>₹{stats.thisMonthPaid.toLocaleString()}</Text>
      </View>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>
    </View>
  );

  const renderPayment = ({ item }: { item: PaymentWithPatient }) => {
    const isPaid = item.status === 'paid';
    const isPending = item.status === 'pending';
    
    return (
      <View style={styles.paymentCard}>
        <View style={styles.paymentHeader}>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName} numberOfLines={1}>{item.patient?.full_name || 'Unknown Patient'}</Text>
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
        renderItem={renderPayment}
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
  listContent: { padding: Spacing.base, paddingBottom: Spacing['6xl'] },
  
  dashboardContainer: { marginBottom: Spacing.xl },
  dashboardTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.text, marginBottom: Spacing.md },
  
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  statCard: { 
    flex: 1, borderRadius: BorderRadius.lg, padding: Spacing.lg, 
    ...Shadows.sm, justifyContent: 'space-between',
  },
  statIcon: { marginBottom: Spacing.sm },
  statLabelInverse: { fontSize: Typography.sm, color: Colors.textInverse, opacity: 0.9, marginBottom: 4 },
  statValueInverse: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textInverse },
  
  monthlyStatCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl, ...Shadows.sm
  },
  monthlyStatHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  monthlyStatLabel: { fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textSecondary },
  monthlyStatValue: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.primary },
  
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.text, marginBottom: Spacing.base },
  
  paymentCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.base,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md, ...Shadows.sm
  },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientInfo: { flex: 1, marginRight: Spacing.md },
  patientName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.text, marginBottom: 2 },
  paymentDate: { fontSize: Typography.xs, color: Colors.textTertiary, textTransform: 'capitalize' },
  
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
  
  fab: {
    position: 'absolute', bottom: Spacing.xl, right: Spacing.xl,
    width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', ...Shadows.md,
  },
});
