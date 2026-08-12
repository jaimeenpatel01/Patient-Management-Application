import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  backgroundColor: string;
}

function QuickAction({ icon, label, color, backgroundColor }: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.quickAction} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
}

function StatCard({ title, value, icon, color, backgroundColor }: StatCardProps) {
  return (
    <View style={[styles.statCard, Shadows.sm]}>
      <View style={[styles.statIcon, { backgroundColor }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();

  const displayName = user?.email?.split('@')[0] ?? 'Doctor';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome */}
      <View style={styles.welcomeSection}>
        <View>
          <Text style={styles.welcomeGreeting}>Good evening,</Text>
          <Text style={styles.welcomeName}>Dr. {displayName}</Text>
        </View>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={24} color={Colors.primary} />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <QuickAction
            icon="person-add-outline"
            label="Add Patient"
            color={Colors.primary}
            backgroundColor={Colors.primaryFaded}
          />
          <QuickAction
            icon="calendar-outline"
            label="Appointment"
            color={Colors.info}
            backgroundColor={Colors.infoLight}
          />
          <QuickAction
            icon="wallet-outline"
            label="Payment"
            color={Colors.success}
            backgroundColor={Colors.successLight}
          />
        </View>
      </View>

      {/* Today's Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today&apos;s Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Appointments"
            value="0"
            icon="calendar"
            color={Colors.info}
            backgroundColor={Colors.infoLight}
          />
          <StatCard
            title="Patients"
            value="0"
            icon="people"
            color={Colors.primary}
            backgroundColor={Colors.primaryFaded}
          />
          <StatCard
            title="Collected"
            value="₹0"
            icon="checkmark-circle"
            color={Colors.success}
            backgroundColor={Colors.successLight}
          />
          <StatCard
            title="Pending"
            value="₹0"
            icon="time"
            color={Colors.warning}
            backgroundColor={Colors.warningLight}
          />
        </View>
      </View>

      {/* Monthly Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>This Month</Text>
        <View style={[styles.monthlyCard, Shadows.sm]}>
          <View style={styles.monthlyRow}>
            <Text style={styles.monthlyLabel}>Total Patients</Text>
            <Text style={styles.monthlyValue}>0</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.monthlyRow}>
            <Text style={styles.monthlyLabel}>Revenue</Text>
            <Text style={[styles.monthlyValue, { color: Colors.success }]}>₹0</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.monthlyRow}>
            <Text style={styles.monthlyLabel}>Outstanding</Text>
            <Text style={[styles.monthlyValue, { color: Colors.warning }]}>₹0</Text>
          </View>
        </View>
      </View>

      {/* Placeholder notice */}
      <View style={styles.notice}>
        <Ionicons name="information-circle-outline" size={18} color={Colors.info} />
        <Text style={styles.noticeText}>
          Dashboard data will be live once patient and appointment modules are built.
        </Text>
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
  welcomeGreeting: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
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
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
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
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.infoLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  noticeText: {
    fontSize: Typography.xs,
    color: Colors.info,
    flex: 1,
    lineHeight: Typography.xs * Typography.normal,
  },
});
