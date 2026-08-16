import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, BorderRadius } from '@/constants/theme';

interface StatusBadgeProps {
  status: string;
}

function StatusBadgeInner({ status }: StatusBadgeProps) {
  const isPaid = status === 'paid';
  const isPending = status === 'pending';

  return (
    <View
      style={[
        styles.badge,
        isPaid ? styles.badgePaid : isPending ? styles.badgePending : styles.badgeOther,
      ]}
    >
      <Text
        style={[
          styles.text,
          isPaid ? styles.textPaid : isPending ? styles.textPending : styles.textOther,
        ]}
      >
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

export const StatusBadge = React.memo(StatusBadgeInner);

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  badgePaid: { backgroundColor: Colors.successLight },
  badgePending: { backgroundColor: Colors.warningLight },
  badgeOther: { backgroundColor: Colors.surfaceSecondary },
  text: { fontSize: Typography.xs, fontWeight: Typography.bold },
  textPaid: { color: Colors.success },
  textPending: { color: Colors.warning },
  textOther: { color: Colors.textSecondary },
});
