import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, ScrollView
} from 'react-native';
import { SearchFilter } from '@/components/ui/SearchFilter';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');

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
          <Text style={styles.cardName} numberOfLines={1}>{item.patient?.full_name || 'Unknown Patient'}</Text>
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

  const filteredAppointments = appointments.filter(a => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      (a.patient?.full_name?.toLowerCase().includes(searchLower) ?? false) ||
      (a.notes?.toLowerCase().includes(searchLower) ?? false);
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

      <View style={styles.filterContainer}>
        <View style={styles.searchBoxWrapper}>
          <SearchFilter
            placeholder="Search patients or notes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            containerStyle={{ borderWidth: 0, paddingHorizontal: 0 }}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilters} contentContainerStyle={styles.statusFiltersContent}>
          <TouchableOpacity 
            style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}>All Status</Text>
          </TouchableOpacity>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <TouchableOpacity 
              key={key}
              style={[styles.filterChip, statusFilter === key && styles.filterChipActive]}
              onPress={() => setStatusFilter(key as AppointmentStatus)}
            >
              <Text style={[styles.filterChipText, statusFilter === key && styles.filterChipTextActive]}>{config.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {filteredAppointments.length > 0 && (
        <View style={styles.countContainer}>
          <Text style={styles.countText}>{filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''}</Text>
        </View>
      )}

      {filteredAppointments.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No Appointments"
          subtitle={searchQuery || statusFilter !== 'all' ? 'No appointments match your filters.' : (activeTab === 'today' ? 'No appointments scheduled for today.' : 'No appointments found.')}
          actionLabel={searchQuery || statusFilter !== 'all' ? 'Clear Filters' : 'Add Appointment'}
          onAction={() => {
            if (searchQuery || statusFilter !== 'all') {
              setSearchQuery('');
              setStatusFilter('all');
            } else {
              router.push('/appointment/add' as any);
            }
          }}
        />
      ) : (
        <FlatList
          data={filteredAppointments}
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
  filterContainer: { backgroundColor: Colors.surface, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  searchBoxWrapper: { backgroundColor: Colors.background, marginHorizontal: Spacing.base, marginTop: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  statusFilters: { marginTop: Spacing.sm },
  statusFiltersContent: { paddingHorizontal: Spacing.base, gap: Spacing.sm },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  filterChipActive: { backgroundColor: Colors.primaryFaded, borderColor: Colors.primary },
  filterChipText: { fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: Typography.medium },
  filterChipTextActive: { color: Colors.primary },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.base, marginBottom: Spacing.sm, ...Shadows.sm,
  },
  cardLeft: { marginRight: Spacing.md, alignItems: 'center', minWidth: 60 },
  cardTime: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.primary },
  cardDuration: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 2 },
  cardRight: { flex: 1, marginRight: Spacing.sm },
  cardName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.text, marginBottom: 2 },
  cardDate: { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.textSecondary },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full, marginTop: 4 },
  statusText: { fontSize: Typography.xs, fontWeight: Typography.semibold },
  cardNotes: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 4 },
  fab: {
    position: 'absolute', right: Spacing.lg, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', ...Shadows.lg,
  },
});
