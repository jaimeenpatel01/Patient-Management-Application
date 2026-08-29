import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { getDashboardStats, DashboardStats } from '@/services/dashboardService';
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
    <TouchableOpacity style={[styles.quickAction, Shadows.sm]} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
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
    <View style={[styles.statCard, Shadows.md]}>
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
  
  // Simple greeting based on time
  const hour = new Date().getHours();
  let greeting = 'Good Evening';
  if (hour < 12) greeting = 'Good Morning';
  else if (hour < 17) greeting = 'Good Afternoon';

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
        <View style={styles.welcomeTextContainer}>
          <Text style={styles.greetingText}>{greeting},</Text>
          <Text style={styles.welcomeName} numberOfLines={1}>{displayName}</Text>
        </View>
        <TouchableOpacity style={styles.avatarContainer} onPress={() => router.push('/profile')} activeOpacity={0.8}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={24} color={Colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { marginBottom: Spacing.md }]}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <QuickAction
            icon="person-add"
            label="Add Patient"
            color={Colors.primary}
            backgroundColor={Colors.primaryFaded}
            onPress={() => router.push('/patient/add')}
          />
          <QuickAction
            icon="checkmark-circle"
            label="Mark Attendance"
            color={Colors.info}
            backgroundColor={Colors.infoLight}
            onPress={() => router.push('/attendance/add' as any)}
          />
          <QuickAction
            icon="wallet"
            label="Record Payment"
            color={Colors.success}
            backgroundColor={Colors.successLight}
            onPress={() => router.push('/payment/add')}
          />
        </View>
      </View>

      {/* Overview */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Patients Overview</Text>
        </View>
        <View style={styles.statsGrid}>
          <StatCard
            title="Active Patients"
            value={stats?.['daily'].overview.activePatients.toString() ?? '0'}
            icon="pulse"
            color={Colors.info}
            backgroundColor={Colors.infoLight}
          />
          <StatCard
            title="Patients Treated"
            value={stats?.['daily'].overview.totalPatients.toString() ?? '0'}
            icon="people"
            color={Colors.primary}
            backgroundColor={Colors.primaryFaded}
          />
        </View>
      </View>

      {/* Payment Summary */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
        </View>
        <View style={[styles.monthlyCard, Shadows.md]}>
          <View style={styles.monthlyAccent} />
          <View style={styles.monthlyContent}>
            <View style={styles.monthlyRow}>
              <Text style={styles.monthlyLabel}>Total Earnings</Text>
              <Text style={[styles.monthlyValue, { color: Colors.success }]}>₹{stats?.['monthly'].payment.revenue ?? 0}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.monthlyRow}>
              <Text style={styles.monthlyLabel}>Total Due</Text>
              <Text style={[styles.monthlyValue, { color: Colors.warning }]}>₹{stats?.['monthly'].payment.outstanding ?? 0}</Text>
            </View>
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
    paddingBottom: Spacing['4xl'],
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
    marginTop: Spacing.xs,
  },
  welcomeTextContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  greetingText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  welcomeName: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.text,
    marginTop: 2,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.surface,
    ...Shadows.sm,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  section: {
    marginBottom: Spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text,
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
    borderWidth: 0,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
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
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 0,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statValue: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.text,
  },
  statTitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
    marginTop: Spacing.xs,
  },
  monthlyCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 0,
  },
  monthlyAccent: {
    width: 6,
    backgroundColor: Colors.primary,
  },
  monthlyContent: {
    flex: 1,
    padding: Spacing.lg,
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
    fontWeight: Typography.medium,
  },
  monthlyValue: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
});
