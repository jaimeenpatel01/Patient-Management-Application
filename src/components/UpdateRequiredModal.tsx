import React from 'react';
import { Modal, View, Text, StyleSheet, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

const ANDROID_PACKAGE = 'com.drketuphysio.doctor';

interface UpdateRequiredModalProps {
  visible: boolean;
  message?: string | null;
  /** Hard = no way to dismiss, blocks the app. Soft = can dismiss and keep using the app for this session. */
  forceUpdate: boolean;
  onDismiss: () => void;
}

export function UpdateRequiredModal({ visible, message, forceUpdate, onDismiss }: UpdateRequiredModalProps) {
  const handleUpdate = () => {
    const url =
      Platform.OS === 'android'
        ? `market://details?id=${ANDROID_PACKAGE}`
        : `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`);
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={forceUpdate ? () => {} : onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.iconBg}>
            <Ionicons name="arrow-up-circle" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.title}>{forceUpdate ? 'Update Required' : 'Update Available'}</Text>
          <Text style={styles.text}>
            {message ||
              (forceUpdate
                ? 'A new version of PhysioDesk is available. Please update to continue using the app.'
                : 'A new version of PhysioDesk is available. We recommend updating soon.')}
          </Text>
          <Button title="Update Now" onPress={handleUpdate} style={styles.button} />
          {!forceUpdate && (
            <Button title="Later" onPress={onDismiss} variant="ghost" style={styles.laterButton} />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius['2xl'],
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    width: 300,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.xl,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
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
    marginBottom: Spacing.lg,
  },
  button: {
    width: '100%',
  },
  laterButton: {
    width: '100%',
    marginTop: Spacing.xs,
  },
});
