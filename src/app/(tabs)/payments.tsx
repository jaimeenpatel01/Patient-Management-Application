import React from 'react';
import { View, StyleSheet } from 'react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors } from '@/constants/theme';

export default function PaymentsScreen() {
  return (
    <View style={styles.container}>
      <EmptyState
        icon="wallet-outline"
        title="No Payments Yet"
        subtitle="Payment recording will be available in Phase 7. You'll be able to track consultation fees, session payments, and view revenue reports here."
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
