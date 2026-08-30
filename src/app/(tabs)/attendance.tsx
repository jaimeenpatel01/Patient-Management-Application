import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter, useFocusEffect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAlert } from '@/contexts/AlertContext';
import { getAttendances, deleteAttendance } from '@/services/attendanceService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { formatTime12Hour } from '@/lib/formatters';
import type { Attendance } from '@/types';

const PAGE_SIZE = 20;

export default function AttendanceScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  // Date Filter State
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadAttendances = useCallback(async (pageNumber = 0, refresh = false, targetDate = filterDate) => {
    if (pageNumber > 0) setIsLoadingMore(true);
    
    // Format date as YYYY-MM-DD for backend
    let formattedDate = undefined;
    if (targetDate) {
      formattedDate = targetDate.toISOString().split('T')[0];
    }

    const { data } = await getAttendances(formattedDate, pageNumber, PAGE_SIZE);
    
    if (refresh || pageNumber === 0) {
      setAttendances(data || []);
    } else {
      setAttendances(prev => [...prev, ...(data || [])]);
    }
    
    setHasMore((data?.length || 0) >= PAGE_SIZE);
    setPage(pageNumber);
    setIsLoadingMore(false);
  }, [filterDate]);

  useFocusEffect(
    useCallback(() => {
      loadAttendances(0, true, filterDate).finally(() => setIsLoading(false));
    }, [loadAttendances, filterDate])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAttendances(0, true, filterDate);
    setIsRefreshing(false);
  };
  
  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore && !isRefreshing && !isLoading) {
      loadAttendances(page + 1, false, filterDate);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      setFilterDate(selectedDate);
      setIsLoading(true);
    }
  };

  const clearDateFilter = () => {
    setFilterDate(null);
    setIsLoading(true);
  };

  const handleDelete = (id: string) => {
    showAlert('Delete Attendance', 'Are you sure you want to delete this record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteAttendance(id);
          loadAttendances(0, true, filterDate);
        },
      },
    ]);
  };

  const groupAttendancesByDate = (data: Attendance[]) => {
    const grouped = data.reduce((acc, curr) => {
      const date = curr.attendance_date || 'Unknown Date';
      if (!acc[date]) acc[date] = [];
      acc[date].push(curr);
      return acc;
    }, {} as Record<string, Attendance[]>);

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

  const sections = useMemo(() => groupAttendancesByDate(attendances), [attendances]);

  const renderHeader = () => {
    if (!filterDate) return null;
    return (
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
    );
  };

  const renderCard = useCallback(({ item }: { item: Attendance }) => {
    return (
      <View style={[styles.card, Shadows.md]}>
        <View style={styles.cardAccent} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.patientInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.patient?.full_name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
              <View>
                <Text style={styles.patientName}>{item.patient?.full_name || 'Unknown Patient'}</Text>
                <View style={styles.dateTimeRow}>
                  <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.dateTimeText}>{formatTime12Hour(item.attendance_time)}</Text>
                </View>
              </View>
            </View>
            <View style={styles.actionsContainer}>
              <TouchableOpacity onPress={() => setActiveActionId(item.id)} style={styles.actionBtn}>
                <Ionicons name="ellipsis-vertical" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          {item.notes ? (
            <View style={styles.notesContainer}>
              <Text style={styles.notesText} numberOfLines={2}>{item.notes}</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }, []);

  if (isLoading && !isRefreshing) {
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
        renderItem={renderCard}
        ListHeaderComponent={renderHeader}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeaderContainer}>
            <Ionicons name="calendar" size={16} color={Colors.textTertiary} style={styles.sectionHeaderIcon} />
            <Text style={styles.sectionHeaderText}>{title}</Text>
            <View style={styles.sectionHeaderLine} />
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
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
            icon="checkmark-circle-outline"
            title="No Attendance Records"
            subtitle={filterDate ? "No attendance found for this date." : "Mark attendance for your patients to see them here."}
            actionLabel={filterDate ? "Clear Filter" : "Mark Attendance"}
            onAction={filterDate ? clearDateFilter : () => router.push('/attendance/add' as any)}
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
              if (id) router.push(`/attendance/add?id=${id}` as any);
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

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/attendance/add' as any)} activeOpacity={0.8}>
        <Ionicons name="add" size={24} color={Colors.textInverse} />
        <Text style={styles.fabText}>Mark Attendance</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: Spacing.base, paddingBottom: 100, paddingTop: Spacing.md },
  
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
  
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 0,
  },
  cardAccent: {
    width: 6,
    backgroundColor: Colors.info,
  },
  cardContent: {
    flex: 1,
    padding: Spacing.base,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.infoLight,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  avatarText: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.info },
  patientName: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.text, marginBottom: 4 },
  dateTimeRow: { flexDirection: 'row', alignItems: 'center' },
  dateTimeText: { fontSize: Typography.sm, color: Colors.textSecondary, marginLeft: 4, fontWeight: Typography.medium },
  actionsContainer: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: Spacing.xs, marginLeft: Spacing.xs },
  notesContainer: { marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  notesText: { fontSize: Typography.sm, color: Colors.textSecondary, fontStyle: 'italic' },
  fab: {
    position: 'absolute', bottom: Spacing.xl, right: Spacing.lg,
    backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full, ...Shadows.xl,
  },
  fabText: { color: Colors.textInverse, fontWeight: Typography.bold, marginLeft: Spacing.xs, fontSize: Typography.base },
});
