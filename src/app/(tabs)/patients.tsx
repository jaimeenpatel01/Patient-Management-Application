import React from 'react';
import { View, StyleSheet } from 'react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors } from '@/constants/theme';

export default function PatientsScreen() {
  return (
    <View style={styles.container}>
      <EmptyState
        icon="people-outline"
        title="No Patients Yet"
        subtitle="Patient management will be available in Phase 3. You'll be able to add, search, and manage patient records here."
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
