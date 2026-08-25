import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '@/contexts/AlertContext';
import { getAttendances, deleteAttendance } from '@/services/attendanceService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { formatTime12Hour } from '@/lib/formatters';
import type { Attendance } from '@/types';

export default function AttendanceScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const loadAttendances = useCallback(async () => {
    const { data } = await getAttendances();
    setAttendances(data || []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAttendances().finally(() => setIsLoading(false));
    }, [loadAttendances])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAttendances();
    setIsRefreshing(false);
  };

  const handleDelete = (id: string) => {
    showAlert('Delete Attendance', 'Are you sure you want to delete this record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteAttendance(id);
          loadAttendances();
        },
      },
    ]);
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
                  <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.dateTimeText}>{item.attendance_date}</Text>
                  <Ionicons name="time-outline" size={14} color={Colors.textSecondary} style={{ marginLeft: Spacing.sm }} />
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
      <FlatList
        data={attendances}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-circle-outline"
            title="No Attendance Records"
            subtitle="Mark attendance for your patients to see them here."
            actionLabel="Mark Attendance"
            onAction={() => router.push('/attendance/add' as any)}
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
