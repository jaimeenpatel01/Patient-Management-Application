import React from 'react';
import { View, StyleSheet } from 'react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors } from '@/constants/theme';

export default function AppointmentsScreen() {
  return (
    <View style={styles.container}>
      <EmptyState
        icon="calendar-outline"
        title="No Appointments Yet"
        subtitle="Appointment scheduling will be available in Phase 4. You'll be able to create, manage, and track appointments here."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
