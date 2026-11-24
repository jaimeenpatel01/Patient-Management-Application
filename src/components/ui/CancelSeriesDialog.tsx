import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

interface CancelSeriesDialogProps {
  visible: boolean;
  patientName: string;
  /** Short schedule description, e.g. "weekly, 10:00 AM". */
  scheduleLabel: string;
  onKeep: () => void;
  onConfirm: () => void;
}

/** Confirmation for cancelling every upcoming appointment in a recurring series. */
export function CancelSeriesDialog({ visible, patientName, scheduleLabel, onKeep, onConfirm }: CancelSeriesDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onKeep}>
      <TouchableWithoutFeedback onPress={onKeep}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.container}>
              <View style={styles.titleRow}>
                <Ionicons name="repeat" size={20} color={Colors.error} />
                <Text style={styles.title}>Cancel recurring schedule?</Text>
              </View>

              <Text style={styles.message}>
                All upcoming visits for <Text style={styles.patientName}>{patientName}</Text> ({scheduleLabel}) will be removed.
              </Text>

              <View style={styles.note}>
                <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.noteText}>{"Completed visits are not affected."}</Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.keepButton} onPress={onKeep} activeOpacity={0.7}>
                  <Text style={styles.keepText}>Keep</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmButton} onPress={onConfirm} activeOpacity={0.7}>
                  <Text style={styles.confirmText}>Cancel schedule</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
    gap: Spacing.md,
    ...Shadows.xl,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.text },
  message: { fontSize: 15, lineHeight: 22, color: Colors.textSecondary },
  patientName: { fontWeight: Typography.bold, color: Colors.text },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
  },
  noteText: { fontSize: 13, color: Colors.textSecondary },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.xs },
  keepButton: {
    minHeight: 44,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
  },
  keepText: { fontSize: 15, fontWeight: Typography.semibold, color: Colors.textSecondary },
  confirmButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.errorLight,
    justifyContent: 'center',
  },
  confirmText: { fontSize: 15, fontWeight: Typography.semibold, color: Colors.error },
});
