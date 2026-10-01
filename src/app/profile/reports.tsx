import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { getInitials } from '@/lib/formatters';
import {
  getRevenueTrend,
  getPatientRetentionStats,
  getAttendanceInsights,
  getTopDiagnoses,
  MonthlyRevenuePoint,
  PatientRetentionStats,
  AttendanceInsights,
  DiagnosisFrequency,
} from '@/services/dashboardService';

/** Compact currency label used above narrow bars (e.g. ₹12.3k) */
function formatCompactCurrency(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return `₹${value}`;
}

interface ReportData {
  revenueTrend: MonthlyRevenuePoint[];
  retention: PatientRetentionStats;
  attendance: AttendanceInsights;
  topDiagnoses: DiagnosisFrequency[];
}

export default function ReportsScreen() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const [revenueRes, retentionRes, attendanceRes, diagnosesRes] = await Promise.all([
      getRevenueTrend(6),
      getPatientRetentionStats(),
      getAttendanceInsights(5),
      getTopDiagnoses(3, 8),
    ]);

    setData({
      revenueTrend: revenueRes.data,
      retention: retentionRes.data,
      attendance: attendanceRes.data,
      topDiagnoses: diagnosesRes.data,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData().finally(() => setLoading(false));
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  }, [fetchData]);

  if (loading) {
    return <LoadingScreen message="Crunching your numbers..." />;
  }

  const maxRevenue = Math.max(1, ...(data?.revenueTrend.map(m => m.total) ?? [1]));
  const maxDiagnosisCount = Math.max(1, ...(data?.topDiagnoses.map(d => d.count) ?? [1]));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />}
    >
      {/* ─── Revenue Trend ─────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue Trend</Text>
        <Text style={styles.sectionSubtitle}>Last 6 months, paid revenue</Text>

        <View style={[styles.card, Shadows.md]}>
          <View style={styles.barChart}>
            {data?.revenueTrend.map((month) => {
              const heightPct = month.total > 0 ? Math.max(4, (month.total / maxRevenue) * 100) : 2;
              return (
                <View key={month.key} style={styles.barColumn}>
                  <Text style={styles.barValueLabel} numberOfLines={1}>
                    {formatCompactCurrency(month.total)}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        { height: `${heightPct}%` as any, backgroundColor: month.total > 0 ? Colors.primary : Colors.borderLight },
                      ]}
                    />
                  </View>
                  <Text style={styles.barMonthLabel}>{month.label.split(' ')[0]}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* ─── Patient Retention ──────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient Retention</Text>
        <Text style={styles.sectionSubtitle}>New vs. returning patients this month</Text>

        <View style={styles.statsRow}>
          <StatTile
            icon="person-add"
            label="New Patients"
            value={String(data?.retention.newPatients ?? 0)}
            color={Colors.info}
            backgroundColor={Colors.infoLight}
          />
          <StatTile
            icon="repeat"
            label="Returning Patients"
            value={String(data?.retention.returningPatients ?? 0)}
            color={Colors.success}
            backgroundColor={Colors.successLight}
          />
        </View>
      </View>

      {/* ─── Attendance Patterns ────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attendance Patterns</Text>
        <Text style={styles.sectionSubtitle}>This month&apos;s session activity</Text>

        <View style={styles.statsRow}>
          <StatTile
            icon="calendar"
            label="Sessions This Month"
            value={String(data?.attendance.totalSessionsThisMonth ?? 0)}
            color={Colors.primary}
            backgroundColor={Colors.primaryFaded}
          />
          <StatTile
            icon="stats-chart"
            label="Avg. Sessions / Patient"
            value={(data?.attendance.averageSessionsPerPatient ?? 0).toFixed(1)}
            color={Colors.warning}
            backgroundColor={Colors.warningLight}
          />
        </View>

        <View style={[styles.card, Shadows.md, { marginTop: Spacing.md }]}>
          <Text style={styles.cardHeading}>Most Active Patients</Text>
          {data && data.attendance.topPatients.length > 0 ? (
            data.attendance.topPatients.map((p, index) => (
              <View key={p.patientId} style={[styles.rankRow, index === data.attendance.topPatients.length - 1 && styles.rankRowLast]}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{getInitials(p.fullName)}</Text>
                </View>
                <Text style={styles.rankLabel} numberOfLines={1}>{p.fullName}</Text>
                <View style={styles.countPill}>
                  <Text style={styles.countPillText}>{p.sessionCount} sessions</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyInlineText}>No attendance recorded this month yet.</Text>
          )}
        </View>
      </View>

      {/* ─── Top Diagnoses ──────────────────────────────── */}
      <View style={[styles.section, { marginBottom: Spacing['3xl'] }]}>
        <Text style={styles.sectionTitle}>Top Diagnoses</Text>
        <Text style={styles.sectionSubtitle}>Last 3 months, ranked by frequency</Text>

        <View style={[styles.card, Shadows.md]}>
          {data && data.topDiagnoses.length > 0 ? (
            data.topDiagnoses.map((d, index) => (
              <View key={d.title} style={[styles.diagnosisRow, index === data.topDiagnoses.length - 1 && styles.rankRowLast]}>
                <View style={styles.diagnosisHeader}>
                  <Text style={styles.diagnosisRank}>{index + 1}</Text>
                  <Text style={styles.diagnosisTitle} numberOfLines={1}>{d.title}</Text>
                  <Text style={styles.diagnosisCount}>{d.count}</Text>
                </View>
                <View style={styles.diagnosisBarTrack}>
                  <View style={[styles.diagnosisBar, { width: `${Math.max(6, (d.count / maxDiagnosisCount) * 100)}%` }]} />
                </View>
              </View>
            ))
          ) : (
            <EmptyState
              icon="clipboard-outline"
              title="No Diagnoses Yet"
              subtitle="Diagnoses recorded in the last 3 months will show up here."
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Stat Tile ────────────────────────────────────────────────

interface StatTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  backgroundColor: string;
}

function StatTile({ icon, label, value, color, backgroundColor }: StatTileProps) {
  return (
    <View style={[styles.statTile, Shadows.sm]}>
      <View style={[styles.statTileIcon, { backgroundColor }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statTileValue}>{value}</Text>
      <Text style={styles.statTileLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const BAR_CHART_HEIGHT = 140;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
  },
  section: {
    marginBottom: Spacing['2xl'],
  },
  sectionTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 0,
  },
  cardHeading: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },

  // Revenue bar chart
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: BAR_CHART_HEIGHT + 44,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barValueLabel: {
    fontSize: 10,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  barTrack: {
    width: '60%',
    height: BAR_CHART_HEIGHT,
    justifyContent: 'flex-end',
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: BorderRadius.sm,
  },
  barMonthLabel: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
    marginTop: Spacing.xs,
  },

  // Stat tiles
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statTile: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 0,
  },
  statTileIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statTileValue: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.text,
  },
  statTileLabel: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
    marginTop: Spacing.xs,
  },

  // Most active patients list
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rankRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.primary,
  },
  rankLabel: {
    flex: 1,
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.text,
    marginRight: Spacing.sm,
  },
  countPill: {
    backgroundColor: Colors.primaryFaded,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  countPillText: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.primary,
  },
  emptyInlineText: {
    fontSize: Typography.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },

  // Top diagnoses ranked list
  diagnosisRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  diagnosisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  diagnosisRank: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.textTertiary,
    width: 20,
  },
  diagnosisTitle: {
    flex: 1,
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.text,
    marginRight: Spacing.sm,
  },
  diagnosisCount: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.primary,
  },
  diagnosisBarTrack: {
    height: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.borderLight,
    overflow: 'hidden',
  },
  diagnosisBar: {
    height: '100%',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
});
