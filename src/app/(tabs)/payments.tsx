import React, { useState, useCallback, memo, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { useRouter, useFocusEffect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAlert } from '@/contexts/AlertContext';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { getPayments, deletePayment, getRevenueStatistics, PaymentWithPatient, RevenueStats } from '@/services/offline/paymentService.offline';
import { groupItemsByDate } from '@/lib/formatters';
import { generateInvoiceHtml, getInvoiceNumber } from '@/lib/invoiceTemplate';

const PAGE_SIZE = 20;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

interface PaymentItemProps {
  item: PaymentWithPatient;
  onMenuPress: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

const PaymentItem = memo(function PaymentItem({ item, onMenuPress, isFirst, isLast }: PaymentItemProps) {
  const patientName = item.patient?.full_name || 'Unknown Patient';
  const statusLabel =
    item.status === 'paid' ? 'Paid' : item.status === 'partially_paid' ? 'Partial' : 'Pending';
  const statusColor = item.status === 'paid' ? Colors.primaryDark : Colors.warningDeep;

  return (
    <View
      style={[
        styles.paymentRow,
        isFirst && styles.paymentRowFirst,
        isLast && styles.paymentRowLast,
        !isFirst && styles.paymentRowDivider,
      ]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(patientName)}</Text>
      </View>
      <View style={styles.paymentContent}>
        <Text style={styles.patientName} numberOfLines={1}>{patientName}</Text>
        <Text style={styles.paymentSubtitle} numberOfLines={1}>
          {item.payment_type.replace('_', ' ')}
          {item.payment_method ? ` · ${item.payment_method.toUpperCase()}` : ''}
        </Text>
        {item.notes && (
          <Text style={styles.notesText} numberOfLines={1}>{item.notes}</Text>
        )}
      </View>
      <View style={styles.amountInfo}>
        <Text style={styles.amountText}>₹{item.amount.toLocaleString()}</Text>
        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
      </View>
      <TouchableOpacity onPress={() => onMenuPress(item.id)} style={styles.actionBtn}>
        <Ionicons name="ellipsis-vertical" size={20} color={Colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
});

export default function PaymentsScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { profile } = useAuth();

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

  const fetchData = useCallback(async (pageNumber: number, statusFilter: string, refresh: boolean, targetDate: Date | null) => {
    if (pageNumber > 0) setIsLoadingMore(true);

    const formattedDate = targetDate ? targetDate.toISOString().split('T')[0] : undefined;

    const [paymentsRes, statsRes] = await Promise.all([
      getPayments(pageNumber, PAGE_SIZE, statusFilter, formattedDate),
      pageNumber === 0 ? getRevenueStatistics() : Promise.resolve(null),
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

    if (statsRes && !statsRes.error) {
      setStats(statsRes.data);
    }

    setIsLoadingMore(false);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData(0, filterStatus, true, filterDate);
    }, [fetchData, filterStatus, filterDate])
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

  const handleGenerateInvoice = async (payment: PaymentWithPatient) => {
    if (!profile) {
      showAlert('Error', 'Profile not loaded. Please try again.');
      return;
    }
    try {
      const html = generateInvoiceHtml(
        payment,
        {
          full_name: payment.patient?.full_name || 'Unknown Patient',
          phone: payment.patient?.phone || undefined,
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
  
  const sections = useMemo(
    () => groupItemsByDate(payments, (p) => p.payment_date),
    [payments]
  );

  const renderHeader = () => (
    <View style={styles.dashboardContainer}>
      <View style={[styles.heroCard, Shadows.md]}>
        <Text style={styles.heroLabel}>Collected this month</Text>
        <Text style={styles.heroValue}>₹{stats.thisMonthPaid.toLocaleString()}</Text>

        <View style={styles.heroDivider} />

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>All-time earnings</Text>
            <Text style={styles.heroStatValue}>₹{stats.totalPaid.toLocaleString()}</Text>
          </View>
          <View style={styles.heroStat}>
            <View style={styles.heroStatLabelRow}>
              <View style={styles.heroDot} />
              <Text style={styles.heroStatLabel}>Outstanding</Text>
            </View>
            <Text style={[styles.heroStatValue, styles.heroStatValueDue]}>₹{stats.totalPending.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Transactions</Text>

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
        renderItem={({ item, index, section }) => (
          <PaymentItem
            item={item}
            onMenuPress={setActiveActionId}
            isFirst={index === 0}
            isLast={index === section.data.length - 1}
          />
        )}
        renderSectionHeader={({ section: { title, data } }) => (
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeaderText}>{title.toUpperCase()}</Text>
            <Text style={styles.sectionHeaderTotal}>
              ₹{data.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
            </Text>
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
            label: 'Generate Invoice',
            icon: 'document-text',
            color: Colors.primary,
            onPress: () => {
              const id = activeActionId;
              setActiveActionId(null);
              const payment = payments.find((p) => p.id === id);
              if (payment) handleGenerateInvoice(payment);
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

  heroCard: {
    backgroundColor: Colors.primaryDeep, borderRadius: BorderRadius.xl, padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  heroLabel: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textInverseMuted },
  heroValue: { fontSize: Typography['3xl'], fontWeight: Typography.bold, color: Colors.textInverse, letterSpacing: -0.5, marginTop: 4 },
  heroDivider: { height: 1, backgroundColor: Colors.dividerOnDark, marginVertical: Spacing.lg },
  heroStatsRow: { flexDirection: 'row', gap: Spacing.md },
  heroStat: { flex: 1 },
  heroStatLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.warningDotOnDark },
  heroStatLabel: { fontSize: Typography.xs, color: Colors.textInverseMuted },
  heroStatValue: { fontSize: Typography.lg, fontWeight: Typography.semibold, color: Colors.textInverse, marginTop: 2 },
  heroStatValueDue: { color: Colors.warningTextOnDark },

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
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  sectionHeaderText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
  sectionHeaderTotal: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textTertiary,
  },

  paymentRow: {
    backgroundColor: Colors.surfaceElevated,
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.base,
  },
  paymentRowFirst: {
    borderTopWidth: 1, borderTopLeftRadius: BorderRadius.lg, borderTopRightRadius: BorderRadius.lg,
  },
  paymentRowLast: {
    borderBottomWidth: 1, borderBottomLeftRadius: BorderRadius.lg, borderBottomRightRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  paymentRowDivider: { borderTopWidth: 1, borderTopColor: Colors.borderLight },

  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryFaded,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.primaryDark },

  paymentContent: { flex: 1 },
  patientName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.text },
  paymentSubtitle: { fontSize: Typography.xs, color: Colors.textSecondary, textTransform: 'capitalize', marginTop: 2 },
  notesText: { fontSize: Typography.xs, color: Colors.textTertiary, fontStyle: 'italic', marginTop: 2 },

  amountInfo: { alignItems: 'flex-end' },
  amountText: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.text },
  statusText: { fontSize: Typography.xs, fontWeight: Typography.semibold, marginTop: 2 },

  actionBtn: { padding: Spacing.xs },
  
  fab: {
    position: 'absolute', bottom: Spacing.xl, right: Spacing.xl,
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', ...Shadows.xl,
  },
});
