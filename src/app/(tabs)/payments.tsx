import React, { useState, useCallback, memo, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { useRouter, useFocusEffect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAlert } from '@/contexts/AlertContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getPayments, deletePayment, getRevenueStatistics, PaymentWithPatient, RevenueStats } from '@/services/paymentService';

const PAGE_SIZE = 20;

export default function PaymentsScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  
  const [payments, setPayments] = useState<PaymentWithPatient[]>([]);
  const [stats, setStats] = useState<RevenueStats>({ totalPaid: 0, totalPending: 0, thisMonthPaid: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  // Date Filter State
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchData = async (pageNumber = 0, statusFilter = filterStatus, refresh = false, targetDate = filterDate) => {
    if (pageNumber > 0) setIsLoadingMore(true);

    let formattedDate = undefined;
    if (targetDate) {
      formattedDate = targetDate.toISOString().split('T')[0];
    }

    const [paymentsRes, statsRes] = await Promise.all([
      getPayments(pageNumber, PAGE_SIZE, statusFilter, formattedDate),
      pageNumber === 0 ? getRevenueStatistics() : Promise.resolve({ data: stats, error: null })
    ]);

    if (!paymentsRes.error) {
      if (refresh || pageNumber === 0) {
        setPayments(paymentsRes.data);
      } else {
        setPayments(prev => [...prev, ...paymentsRes.data]);
      }
      setHasMore(paymentsRes.data.length >= PAGE_SIZE);
      setPage(pageNumber);
    }
    
    if (!statsRes.error && pageNumber === 0) {
      setStats(statsRes.data);
    }
    
    setIsLoadingMore(false);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchData(0, filterStatus, true, filterDate);
    }, [filterStatus, filterDate])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(0, filterStatus, true, filterDate);
    setRefreshing(false);
  };
  
  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore && !refreshing && !loading) {
      fetchData(page + 1, filterStatus, false, filterDate);
    }
  };

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    setLoading(true);
    fetchData(0, status, true, filterDate);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      setFilterDate(selectedDate);
      setLoading(true);
    }
  };

  const clearDateFilter = () => {
    setFilterDate(null);
    setLoading(true);
  };

  const handleDelete = (id: string) => {
    showAlert('Delete Payment', 'Are you sure you want to delete this payment record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePayment(id);
          fetchData(0, filterStatus, true, filterDate);
        },
      },
    ]);
  };
  
  const groupPaymentsByDate = (data: PaymentWithPatient[]) => {
    const grouped = data.reduce((acc, curr) => {
      const date = curr.payment_date || 'Unknown Date';
      if (!acc[date]) acc[date] = [];
      acc[date].push(curr);
      return acc;
    }, {} as Record<string, PaymentWithPatient[]>);

    return Object.keys(grouped)
      .sort((a, b) => (a < b ? 1 : -1))
      .map(date => {
        let formattedDate = date;
        if (date !== 'Unknown Date') {
          const parts = date.split('-');
          if (parts.length === 3) {
            formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
        }
        return { title: formattedDate, data: grouped[date] };
      });
  };

  const sections = useMemo(() => groupPaymentsByDate(payments), [payments]);

  const renderHeader = () => (
    <View style={styles.dashboardContainer}>
      <Text style={styles.dashboardTitle}>Revenue Dashboard</Text>
      
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: Colors.primary }, Shadows.md]}>
          <Ionicons name="wallet" size={28} color={Colors.textInverse} style={styles.statIcon} />
          <Text style={styles.statLabelInverse}>Total Earnings</Text>
          <Text style={styles.statValueInverse}>₹{stats.totalPaid.toLocaleString()}</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: Colors.warning }, Shadows.md]}>
          <Ionicons name="time" size={28} color={Colors.textInverse} style={styles.statIcon} />
          <Text style={styles.statLabelInverse}>Total Due</Text>
          <Text style={styles.statValueInverse}>₹{stats.totalPending.toLocaleString()}</Text>
        </View>
      </View>

      <View style={[styles.monthlyStatCard, Shadows.md]}>
        <View style={styles.monthlyStatHeader}>
          <View style={styles.monthlyIconBg}>
            <Ionicons name="calendar" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.monthlyStatLabel}>This Month Earnings</Text>
        </View>
        <Text style={styles.monthlyStatValue}>₹{stats.thisMonthPaid.toLocaleString()}</Text>
      </View>
      
      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      
      {filterDate && (
        <View style={styles.activeFilterContainer}>
          <View style={styles.activeFilterChip}>
            <Ionicons name="calendar" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.activeFilterText}>
              {filterDate.toLocaleDateString()}
            </Text>
            <TouchableOpacity onPress={clearDateFilter} style={styles.clearFilterBtn}>
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['all', 'paid', 'pending', 'partially_paid'].map((status) => (
            <TouchableOpacity 
              key={status}
              style={[
                styles.filterChip, 
                filterStatus === status && styles.filterChipActive
              ]}
              onPress={() => handleFilterChange(status)}
            >
              <Text style={[
                styles.filterChipText,
                filterStatus === status && styles.filterChipTextActive
              ]}>
                {status === 'partially_paid' ? 'Partial' : status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
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
                {item.payment_type.replace('_', ' ')}
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

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Tabs.Screen 
        options={{ 
          headerRight: () => (
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ marginRight: Spacing.base, padding: Spacing.xs }}>
              <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
            </TouchableOpacity>
          )
        }} 
      />

      {showDatePicker && (
        <DateTimePicker
          value={filterDate || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PaymentItem item={item} />}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeaderContainer}>
            <Ionicons name="calendar" size={16} color={Colors.textTertiary} style={styles.sectionHeaderIcon} />
            <Text style={styles.sectionHeaderText}>{title}</Text>
            <View style={styles.sectionHeaderLine} />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={{ padding: Spacing.md }}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No Transactions"
            subtitle={filterDate ? "No payments found for this date." : "No payments match your current filter."}
            actionLabel={filterDate ? "Clear Date Filter" : undefined}
            onAction={filterDate ? clearDateFilter : undefined}
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
  
  dashboardContainer: { marginBottom: Spacing.md },
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
  
  activeFilterContainer: {
    marginBottom: Spacing.sm,
    flexDirection: 'row',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryFaded,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  activeFilterText: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.primary,
    marginRight: Spacing.sm,
  },
  clearFilterBtn: {
    padding: 2,
  },

  filterContainer: {
    marginVertical: Spacing.sm,
  },
  filterScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.textInverse,
  },
  
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  sectionHeaderIcon: {
    marginRight: Spacing.sm,
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
