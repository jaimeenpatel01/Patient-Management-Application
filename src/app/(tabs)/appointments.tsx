import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAlert } from '@/contexts/AlertContext';
import { useToast } from '@/contexts/ToastContext';
import {
  getAppointments,
  updateAppointment,
  deleteAppointment,
  cancelAppointmentSeries,
  topUpSeriesIfNeeded,
} from '@/services/offline/appointmentService.offline';
import { createAttendance, getAttendances, deleteAttendance } from '@/services/offline/attendanceService.offline';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionMenu, ActionMenuOption } from '@/components/ui/ActionMenu';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CancelSeriesDialog } from '@/components/ui/CancelSeriesDialog';
import { formatTime12Hour, formatRecurrenceSummary, groupItemsByDate, toLocalDateString } from '@/lib/formatters';
import type { Appointment } from '@/types';

const PAGE_SIZE = 20;

export default function AppointmentsScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { showToast } = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [seriesToCancel, setSeriesToCancel] = useState<Appointment | null>(null);

  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadAppointments = useCallback(async (pageNumber = 0, refresh = false, targetDate = filterDate) => {
    if (pageNumber > 0) setIsLoadingMore(true);

    const formattedDate = targetDate ? toLocalDateString(targetDate) : undefined;
    const { data } = await getAppointments({ date: formattedDate }, pageNumber, PAGE_SIZE);

    if (refresh || pageNumber === 0) {
      setAppointments(data || []);
    } else {
      setAppointments((prev) => [...prev, ...(data || [])]);
    }

    setHasMore((data?.length || 0) >= PAGE_SIZE);
    setPage(pageNumber);
    setIsLoadingMore(false);
  }, [filterDate]);

  useFocusEffect(
    useCallback(() => {
      topUpSeriesIfNeeded().finally(() => {
        loadAppointments(0, true, filterDate).finally(() => setIsLoading(false));
      });
    }, [loadAppointments, filterDate])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAppointments(0, true, filterDate);
    setIsRefreshing(false);
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore && !isRefreshing && !isLoading) {
      loadAppointments(page + 1, false, filterDate);
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

  const handleMarkStatus = async (appointment: Appointment, status: 'completed' | 'no_show' | 'cancelled') => {
    await updateAppointment(appointment.id, { status });

    if (status === 'completed') {
      const { error } = await createAttendance({
        patient_id: appointment.patient_id,
        attendance_date: appointment.appointment_date,
        attendance_time: appointment.appointment_time,
        notes: appointment.notes,
      });
      if (error) {
        showToast('Appointment marked completed, but logging attendance failed.', 'warning');
      }
    }

    loadAppointments(0, true, filterDate);
  };

  /** Reverts a completed appointment to scheduled and removes the attendance logged when it was completed. */
  const handleUndoCompleted = async (appointment: Appointment) => {
    const { error } = await updateAppointment(appointment.id, { status: 'scheduled' });
    if (error) {
      showToast('Could not undo. Please try again.', 'error');
      return;
    }

    // Attendances aren't linked to appointments, so match the one Mark Completed
    // created: same patient, date and time.
    const { data: attendances } = await getAttendances(appointment.appointment_date, 0, 100);
    const attendance = attendances?.find(
      (a) => a.patient_id === appointment.patient_id && a.attendance_time === appointment.appointment_time
    );
    if (attendance) {
      await deleteAttendance(attendance.id);
    } else {
      showToast('Appointment set back to scheduled. Check Attendance for a leftover entry.', 'warning');
    }

    loadAppointments(0, true, filterDate);
  };

  const handleDelete = (id: string) => {
    showAlert('Delete Appointment', 'Are you sure you want to delete this appointment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteAppointment(id);
          loadAppointments(0, true, filterDate);
        },
      },
    ]);
  };

  const handleConfirmCancelSeries = async () => {
    const appointment = seriesToCancel;
    setSeriesToCancel(null);
    if (!appointment) return;
    const { error } = await cancelAppointmentSeries(appointment.series_id);
    if (error) {
      showToast('Could not cancel the schedule. Please try again.', 'error');
    }
    loadAppointments(0, true, filterDate);
  };

  const sections = useMemo(
    () => groupItemsByDate(appointments, (a) => a.appointment_date, 'asc'),
    [appointments]
  );

  const renderHeader = () => {
    if (!filterDate) return null;
    return (
      <View style={styles.activeFilterContainer}>
        <View style={styles.activeFilterChip}>
          <Ionicons name="calendar" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.activeFilterText}>{filterDate.toLocaleDateString()}</Text>
          <TouchableOpacity onPress={clearDateFilter} style={styles.clearFilterBtn}>
            <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCard = useCallback(({ item }: { item: Appointment }) => {
    const isRecurring = item.series && item.series.frequency !== 'one_off';
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
                  <Text style={styles.dateTimeText}>{formatTime12Hour(item.appointment_time)}</Text>
                  {isRecurring && (
                    <Ionicons name="repeat" size={14} color={Colors.primary} style={{ marginLeft: Spacing.sm }} />
                  )}
                </View>
              </View>
            </View>
            <View style={styles.actionsContainer}>
              <StatusBadge status={item.status} />
              <TouchableOpacity onPress={() => setActiveAppointment(item)} style={styles.actionBtn}>
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

  const actionOptions = useMemo((): ActionMenuOption[] => {
    if (!activeAppointment) return [];
    const appointment = activeAppointment;
    const options: ActionMenuOption[] = [];

    if (appointment.status === 'completed') {
      options.push(
        {
          label: 'Record Payment',
          icon: 'wallet',
          color: Colors.primary,
          onPress: () => {
            setActiveAppointment(null);
            router.push(`/payment/add?patientId=${appointment.patient_id}` as any);
          },
        },
        {
          label: 'Add Consultation Notes',
          icon: 'document-text',
          color: Colors.primary,
          onPress: () => {
            setActiveAppointment(null);
            router.push(`/consultation/add?patientId=${appointment.patient_id}` as any);
          },
        },
        {
          label: 'Book Follow-up',
          icon: 'calendar',
          color: Colors.primary,
          onPress: () => {
            setActiveAppointment(null);
            router.push(`/appointment/add?patientId=${appointment.patient_id}` as any);
          },
        },
        {
          label: 'Undo Completed',
          icon: 'arrow-undo',
          color: Colors.warning,
          onPress: () => {
            setActiveAppointment(null);
            handleUndoCompleted(appointment);
          },
        }
      );
    }

    options.push({
      label: 'Edit',
      icon: 'pencil',
      color: Colors.primary,
      onPress: () => {
        setActiveAppointment(null);
        router.push(`/appointment/add?id=${appointment.id}` as any);
      },
    });

    if (appointment.status === 'scheduled') {
      options.push(
        {
          label: 'Mark Completed',
          icon: 'checkmark-circle',
          color: Colors.success,
          onPress: () => {
            setActiveAppointment(null);
            handleMarkStatus(appointment, 'completed');
          },
        },
        {
          label: 'Mark No-show',
          icon: 'close-circle',
          color: Colors.warning,
          onPress: () => {
            setActiveAppointment(null);
            handleMarkStatus(appointment, 'no_show');
          },
        },
        {
          label: 'Cancel This Appointment',
          icon: 'ban',
          color: Colors.error,
          onPress: () => {
            setActiveAppointment(null);
            handleMarkStatus(appointment, 'cancelled');
          },
        }
      );
    }

    if (appointment.series && appointment.series.frequency !== 'one_off') {
      options.push({
        label: 'Cancel Entire Schedule',
        icon: 'trash',
        color: Colors.error,
        onPress: () => {
          setActiveAppointment(null);
          setSeriesToCancel(appointment);
        },
      });
    } else {
      options.push({
        label: 'Delete',
        icon: 'trash',
        color: Colors.error,
        onPress: () => {
          setActiveAppointment(null);
          handleDelete(appointment.id);
        },
      });
    }

    return options;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAppointment]);

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
          ),
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
            icon="calendar-outline"
            title="No Appointments"
            subtitle={filterDate ? 'No appointments scheduled for this date.' : 'Schedule a patient appointment to see it here.'}
            actionLabel={filterDate ? 'Clear Filter' : 'New Appointment'}
            onAction={filterDate ? clearDateFilter : () => router.push('/appointment/add' as any)}
          />
        }
      />

      <ActionMenu
        visible={!!activeAppointment}
        onClose={() => setActiveAppointment(null)}
        options={actionOptions}
        title={activeAppointment?.series && activeAppointment.series.frequency !== 'one_off'
          ? formatRecurrenceSummary(activeAppointment.series.frequency)
          : undefined}
      />

      <CancelSeriesDialog
        visible={!!seriesToCancel}
        patientName={seriesToCancel?.patient?.full_name || 'this patient'}
        scheduleLabel={seriesToCancel
          ? `${formatRecurrenceSummary(seriesToCancel.series?.frequency ?? 'one_off').toLowerCase()}, ${formatTime12Hour(seriesToCancel.appointment_time)}`
          : ''}
        onKeep={() => setSeriesToCancel(null)}
        onConfirm={handleConfirmCancelSeries}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/appointment/add' as any)} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color={Colors.textInverse} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: Spacing.base, paddingBottom: Spacing['6xl'], paddingTop: Spacing.md },

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
    backgroundColor: Colors.primary,
  },
  cardContent: {
    flex: 1,
    padding: Spacing.base,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryFaded,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  avatarText: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.primary },
  patientName: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.text, marginBottom: 4 },
  dateTimeRow: { flexDirection: 'row', alignItems: 'center' },
  dateTimeText: { fontSize: Typography.sm, color: Colors.textSecondary, marginLeft: 4, fontWeight: Typography.medium },
  actionsContainer: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { padding: Spacing.xs, marginLeft: Spacing.xs },
  notesContainer: { marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  notesText: { fontSize: Typography.sm, color: Colors.textSecondary, fontStyle: 'italic' },
  fab: {
    position: 'absolute', bottom: Spacing.xl, right: Spacing.lg,
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', ...Shadows.xl,
  },
});
