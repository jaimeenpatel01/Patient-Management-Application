import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { SuccessCheckmark } from './SuccessCheckmark';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

interface SuccessModalProps {
  visible: boolean;
  title?: string;
  message: string;
}

export function SuccessModal({ visible, title = 'Success!', message }: SuccessModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <SuccessCheckmark />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.text}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius['2xl'],
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    width: 260,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xl,
  },
  title: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  text: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
