import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAppointments } from '@/services/appointmentService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Appointment, AppointmentStatus } from '@/types';

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

const STATUS_CONFIG: Record<AppointmentStatus, { color: string; bg: string; label: string }> = {
  scheduled: { color: Colors.scheduled, bg: Colors.infoLight, label: 'Scheduled' },
  completed: { color: Colors.completed, bg: Colors.successLight, label: 'Completed' },
  cancelled: { color: Colors.cancelled, bg: Colors.errorLight, label: 'Cancelled' },
  no_show: { color: Colors.noShow, bg: Colors.warningLight, label: 'No Show' },
};

type FilterTab = 'today' | 'upcoming' | 'all';

export default function AppointmentsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('today');

  const loadAppointments = useCallback(async () => {
    const date = activeTab === 'today' ? getTodayString() : undefined;
    const result = await getAppointments(date);
    let filtered = result.data;
    if (activeTab === 'upcoming') {
      const today = getTodayString();
      filtered = filtered.filter((a) => a.appointment_date >= today && a.status === 'scheduled');
    }
    setAppointments(filtered);
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadAppointments().finally(() => setIsLoading(false));
    }, [loadAppointments])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAppointments();
    setIsRefreshing(false);
  };

  const renderCard = ({ item }: { item: Appointment }) => {
    const status = STATUS_CONFIG[item.status];
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/appointment/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.cardTime}>{formatTime(item.appointment_time)}</Text>
          <Text style={styles.cardDuration}>{item.duration_minutes} min</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardDate}>{item.appointment_date}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          {item.notes && <Text style={styles.cardNotes} numberOfLines={1}>{item.notes}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
      </TouchableOpacity>
    );
  };

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'all', label: 'All' },
  ];

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {appointments.length > 0 && (
        <View style={styles.countContainer}>
          <Text style={styles.countText}>{appointments.length} appointment{appointments.length !== 1 ? 's' : ''}</Text>
        </View>
      )}

      {appointments.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No Appointments"
          subtitle={activeTab === 'today' ? 'No appointments scheduled for today.' : 'No appointments found.'}
          actionLabel="Add Appointment"
          onAction={() => router.push('/appointment/add' as any)}
        />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/appointment/add' as any)} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color={Colors.textInverse} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  tabBar: {
    flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: Spacing.base,
  },
  tab: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary, fontWeight: Typography.semibold },
  countContainer: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  countText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  listContent: { paddingHorizontal: Spacing.base, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.base, marginBottom: Spacing.sm, ...Shadows.sm,
  },
  cardLeft: { marginRight: Spacing.md, alignItems: 'center', minWidth: 60 },
  cardTime: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.primary },
  cardDuration: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 2 },
  cardRight: { flex: 1, marginRight: Spacing.sm },
  cardDate: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.text },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full, marginTop: 4 },
  statusText: { fontSize: Typography.xs, fontWeight: Typography.semibold },
  cardNotes: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 4 },
  fab: {
    position: 'absolute', right: Spacing.lg, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', ...Shadows.lg,
  },
});
