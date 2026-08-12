import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAppointmentById, updateAppointment, deleteAppointment } from '@/services/appointmentService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import type { Appointment, AppointmentStatus } from '@/types';

const STATUS_CONFIG: Record<AppointmentStatus, { color: string; bg: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  scheduled: { color: Colors.scheduled, bg: Colors.infoLight, label: 'Scheduled', icon: 'time-outline' },
  completed: { color: Colors.completed, bg: Colors.successLight, label: 'Completed', icon: 'checkmark-circle-outline' },
  cancelled: { color: Colors.cancelled, bg: Colors.errorLight, label: 'Cancelled', icon: 'close-circle-outline' },
  no_show: { color: Colors.noShow, bg: Colors.warningLight, label: 'No Show', icon: 'alert-circle-outline' },
};

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setIsLoading(true);
      getAppointmentById(id).then((r) => {
        if (r.error) setError(r.error); else setAppt(r.data);
        setIsLoading(false);
      });
    }, [id])
  );

  const handleStatusChange = (newStatus: AppointmentStatus) => {
    if (!id) return;
    Alert.alert('Update Status', `Mark as ${STATUS_CONFIG[newStatus].label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm', onPress: async () => {
          const { data } = await updateAppointment(id, { status: newStatus });
          if (data) setAppt(data);
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Appointment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteAppointment(id!); router.back(); } },
    ]);
  };

  if (isLoading) return (<><Stack.Screen options={{ title: 'Appointment' }} /><View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View></>);
  if (error || !appt) return (<><Stack.Screen options={{ title: 'Appointment' }} /><View style={styles.center}><Ionicons name="alert-circle-outline" size={48} color={Colors.error} /><Text style={styles.errorText}>{error || 'Not found'}</Text><Button title="Go Back" onPress={() => router.back()} variant="outline" size="sm" fullWidth={false} style={{ marginTop: Spacing.base }} /></View></>);

  const sc = STATUS_CONFIG[appt.status];

  return (
    <>
      <Stack.Screen options={{ title: 'Appointment Details' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Status header */}
        <View style={[styles.statusHeader, { backgroundColor: sc.bg }]}>
          <Ionicons name={sc.icon} size={32} color={sc.color} />
          <Text style={[styles.statusLabel, { color: sc.color }]}>{sc.label}</Text>
        </View>

        {/* Details card */}
        <View style={styles.card}>
          <View style={styles.row}><Ionicons name="calendar-outline" size={18} color={Colors.primary} /><View style={styles.rowContent}><Text style={styles.label}>Date</Text><Text style={styles.value}>{appt.appointment_date}</Text></View></View>
          <View style={styles.row}><Ionicons name="time-outline" size={18} color={Colors.primary} /><View style={styles.rowContent}><Text style={styles.label}>Time</Text><Text style={styles.value}>{formatTime(appt.appointment_time)}</Text></View></View>
          <View style={styles.row}><Ionicons name="hourglass-outline" size={18} color={Colors.primary} /><View style={styles.rowContent}><Text style={styles.label}>Duration</Text><Text style={styles.value}>{appt.duration_minutes} minutes</Text></View></View>
        </View>

        {appt.notes && (
          <View style={styles.card}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{appt.notes}</Text>
          </View>
        )}

        {/* Quick status actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {appt.status !== 'completed' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.successLight }]} onPress={() => handleStatusChange('completed')}>
              <Ionicons name="checkmark-circle-outline" size={20} color={Colors.completed} />
              <Text style={[styles.actionText, { color: Colors.completed }]}>Complete</Text>
            </TouchableOpacity>
          )}
          {appt.status !== 'cancelled' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.errorLight }]} onPress={() => handleStatusChange('cancelled')}>
              <Ionicons name="close-circle-outline" size={20} color={Colors.cancelled} />
              <Text style={[styles.actionText, { color: Colors.cancelled }]}>Cancel</Text>
            </TouchableOpacity>
          )}
          {appt.status !== 'no_show' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.warningLight }]} onPress={() => handleStatusChange('no_show')}>
              <Ionicons name="alert-circle-outline" size={20} color={Colors.noShow} />
              <Text style={[styles.actionText, { color: Colors.noShow }]}>No Show</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.dangerZone}>
          <Button title="Delete Appointment" onPress={handleDelete} variant="danger" icon={<Ionicons name="trash-outline" size={18} color={Colors.textInverse} />} />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing['4xl'] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, paddingHorizontal: Spacing['2xl'] },
  errorText: { fontSize: Typography.base, color: Colors.textSecondary, marginTop: Spacing.base, textAlign: 'center' },
  statusHeader: { alignItems: 'center', paddingVertical: Spacing['2xl'], gap: Spacing.sm },
  statusLabel: { fontSize: Typography.xl, fontWeight: Typography.bold },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.base, marginHorizontal: Spacing.base, marginTop: Spacing.base, ...Shadows.sm },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.md },
  rowContent: { flex: 1 },
  label: { fontSize: Typography.xs, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: Typography.medium },
  value: { fontSize: Typography.base, color: Colors.text, marginTop: 2 },
  notesTitle: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.text, marginBottom: Spacing.xs },
  notesText: { fontSize: Typography.base, color: Colors.textSecondary, lineHeight: Typography.base * Typography.relaxed },
  sectionTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.text, paddingHorizontal: Spacing.base, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.base },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg },
  actionText: { fontSize: Typography.sm, fontWeight: Typography.semibold },
  dangerZone: { marginTop: Spacing['2xl'], paddingHorizontal: Spacing.base },
});
