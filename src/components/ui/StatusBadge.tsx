import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, BorderRadius } from '@/constants/theme';

interface StatusBadgeProps {
  status: string;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  paid: { bg: Colors.successLight, text: Colors.success, border: 'rgba(22, 163, 74, 0.25)' },
  completed: { bg: Colors.successLight, text: Colors.success, border: 'rgba(22, 163, 74, 0.25)' },
  pending: { bg: Colors.warningLight, text: Colors.warning, border: 'rgba(217, 119, 6, 0.25)' },
  scheduled: { bg: Colors.infoLight, text: Colors.info, border: 'rgba(37, 99, 235, 0.25)' },
  cancelled: { bg: Colors.errorLight, text: Colors.error, border: 'rgba(220, 38, 38, 0.25)' },
  no_show: { bg: Colors.warningLight, text: Colors.warning, border: 'rgba(217, 119, 6, 0.25)' },
};

const DEFAULT_CONFIG = { bg: Colors.surfaceSecondary, text: Colors.textSecondary, border: Colors.border };

function StatusBadgeInner({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || DEFAULT_CONFIG;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.text }]} />
      <Text style={[styles.text, { color: config.text }]}>
        {status.replace('_', ' ').toUpperCase()}
      </Text>
    </View>
  );
}

export const StatusBadge = React.memo(StatusBadgeInner);

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    letterSpacing: 0.3,
  },
});
