import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { getDashboardStats, DashboardStats, DashboardFilter } from '@/services/dashboardService';
import { getDoctorDisplayName } from '@/lib/formatters';

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  backgroundColor: string;
  onPress: () => void;
}

const QuickAction = React.memo(function QuickAction({ icon, label, color, backgroundColor, onPress }: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.quickAction} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
});

interface FilterTabsProps {
  value: DashboardFilter;
  onChange: (value: DashboardFilter) => void;
}

const FILTER_OPTIONS: { label: string; value: DashboardFilter }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

const FilterTabs = React.memo(function FilterTabs({ value, onChange }: FilterTabsProps) {
  return (
    <View style={styles.filterTabs}>
      {FILTER_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.filterTab, value === opt.value && styles.filterTabActive]}
          onPress={() => onChange(opt.value)}
        >
          <Text style={[styles.filterTabText, value === opt.value && styles.filterTabTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

interface StatCardProps {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
}

const StatCard = React.memo(function StatCard({ title, value, icon, color, backgroundColor }: StatCardProps) {
  return (
    <View style={[styles.statCard, Shadows.sm]}>
      <View style={[styles.statIcon, { backgroundColor }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
});

export default function DashboardScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overviewFilter, setOverviewFilter] = useState<DashboardFilter>('daily');
  const [paymentFilter, setPaymentFilter] = useState<DashboardFilter>('monthly');

  const fetchStats = async () => {
    const { data } = await getDashboardStats();
    if (data) {
      setStats(data);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats().finally(() => setLoading(false));
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats().finally(() => setRefreshing(false));
  }, []);

  const displayName = getDoctorDisplayName(profile?.full_name ?? null, user?.email);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />}
    >
      {/* Welcome */}
      <View style={styles.welcomeSection}>
        <View>
          <Text style={styles.welcomeName}>{displayName}</Text>
        </View>
        <View style={styles.avatarContainer}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={24} color={Colors.primary} />
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { marginBottom: Spacing.md }]}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <QuickAction
            icon="person-add-outline"
            label="Add Patient"
            color={Colors.primary}
            backgroundColor={Colors.primaryFaded}
            onPress={() => router.push('/patient/add')}
          />
          <QuickAction
            icon="checkmark-circle-outline"
            label="Attendance"
            color={Colors.info}
            backgroundColor={Colors.infoLight}
            onPress={() => router.push('/attendance/add' as any)}
          />
          <QuickAction
            icon="wallet-outline"
            label="Payment"
            color={Colors.success}
            backgroundColor={Colors.successLight}
            onPress={() => router.push('/payment/add')}
          />
        </View>
      </View>

      {/* Overview */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <FilterTabs value={overviewFilter} onChange={setOverviewFilter} />
        </View>
        <View style={styles.statsGrid}>
          <StatCard
            title="Active Patients"
            value={stats?.[overviewFilter].overview.activePatients.toString() ?? '0'}
            icon="pulse"
            color={Colors.info}
            backgroundColor={Colors.infoLight}
          />
          <StatCard
            title="Total Treated"
            value={stats?.[overviewFilter].overview.totalPatients.toString() ?? '0'}
            icon="people"
            color={Colors.primary}
            backgroundColor={Colors.primaryFaded}
          />
          <StatCard
            title="Collected"
            value={`₹${stats?.[overviewFilter].overview.collected ?? 0}`}
            icon="checkmark-circle"
            color={Colors.success}
            backgroundColor={Colors.successLight}
          />
          <StatCard
            title="Pending"
            value={`₹${stats?.[overviewFilter].overview.pending ?? 0}`}
            icon="time"
            color={Colors.warning}
            backgroundColor={Colors.warningLight}
          />
        </View>
      </View>

      {/* Payment Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payments</Text>
          <FilterTabs value={paymentFilter} onChange={setPaymentFilter} />
        </View>
        <View style={[styles.monthlyCard, Shadows.sm]}>
          <View style={styles.monthlyRow}>
            <Text style={styles.monthlyLabel}>Total Patients</Text>
            <Text style={styles.monthlyValue}>{stats?.[paymentFilter].payment.totalPatients ?? 0}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.monthlyRow}>
            <Text style={styles.monthlyLabel}>Revenue</Text>
            <Text style={[styles.monthlyValue, { color: Colors.success }]}>₹{stats?.[paymentFilter].payment.revenue ?? 0}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.monthlyRow}>
            <Text style={styles.monthlyLabel}>Outstanding</Text>
            <Text style={[styles.monthlyValue, { color: Colors.warning }]}>₹{stats?.[paymentFilter].payment.outstanding ?? 0}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
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
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  welcomeName: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.full,
    padding: 2,
  },
  filterTab: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  filterTabActive: {
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  filterTabText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  filterTabTextActive: {
    color: Colors.primary,
    fontWeight: Typography.bold,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.medium,
    color: Colors.text,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.text,
  },
  statTitle: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  monthlyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  monthlyLabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  monthlyValue: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
});
