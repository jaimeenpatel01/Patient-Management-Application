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
  currentVersion?: string | null;
  minVersion?: string | null;
  onDismiss: () => void;
}

export function UpdateRequiredModal({
  visible,
  message,
  forceUpdate,
  currentVersion,
  minVersion,
  onDismiss,
}: UpdateRequiredModalProps) {
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
          <View style={styles.header}>
            <View style={styles.iconBg}>
              <Ionicons name="arrow-up-circle" size={30} color={Colors.textInverse} />
            </View>
            {!!currentVersion && !!minVersion && (
              <View style={styles.versionRow}>
                <View style={styles.versionPillOld}>
                  <Text style={styles.versionPillOldText}>v{currentVersion}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={Colors.textInverse} />
                <View style={styles.versionPillNew}>
                  <Text style={styles.versionPillNewText}>v{minVersion}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.body}>
            <Text style={styles.title}>
              {forceUpdate ? 'Update Required' : 'A New Version Is Ready'}
            </Text>
            <Text style={styles.text}>
              {message ||
                (forceUpdate
                  ? 'A new version of PhysioDesk is available. Please update to continue using the app.'
                  : 'Update to get the latest fixes and improvements.')}
            </Text>
            <Button title="Update Now" onPress={handleUpdate} style={styles.button} />
            {!forceUpdate && (
              <Button title="Remind Me Later" onPress={onDismiss} variant="ghost" style={styles.laterButton} />
            )}
          </View>
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
    width: 300,
    overflow: 'hidden',
    ...Shadows.xl,
  },
  header: {
    backgroundColor: Colors.primaryDeep,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  iconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  versionPillOld: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  versionPillOldText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textInverseMuted,
    textDecorationLine: 'line-through',
  },
  versionPillNew: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
  },
  versionPillNewText: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.primaryDeep,
  },
  body: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
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
