import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableWithoutFeedback, Platform } from 'react-native';
import { useAlert } from '@/contexts/AlertContext';
import { Button } from '@/components/ui/Button';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

export function CustomAlert() {
  const { alertState, hideAlert } = useAlert();
  const { visible, title, message, buttons, options } = alertState;

  const handleDismiss = () => {
    if (options?.cancelable) {
      hideAlert();
      options?.onDismiss?.();
    }
  };

  const handleButtonPress = (onPress?: () => void) => {
    hideAlert();
    onPress?.();
  };

  const renderButtons = () => {
    if (!buttons || buttons.length === 0) {
      return (
        <Button
          title="OK"
          onPress={() => handleButtonPress()}
          fullWidth={true}
        />
      );
    }

    // If 2 buttons, render side by side. Otherwise stack them.
    const isSideBySide = buttons.length === 2;

    return (
      <View style={[styles.buttonsContainer, isSideBySide && styles.buttonsRow]}>
        {buttons.map((btn, index) => {
          let variant: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' = 'primary';
          if (btn.style === 'cancel') variant = 'ghost';
          if (btn.style === 'destructive') variant = 'danger';

          return (
            <View key={index} style={isSideBySide ? styles.flex1 : styles.stackedButton}>
              <Button
                title={btn.text}
                variant={variant}
                onPress={() => handleButtonPress(btn.onPress)}
                fullWidth={true}
              />
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.alertContainer}>
              <Text style={styles.title}>{title}</Text>
              {!!message && <Text style={styles.message}>{message}</Text>}
              <View style={styles.actions}>
                {renderButtons()}
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
  alertContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...Shadows.xl,
  },
  title: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    textAlign: 'center',
    lineHeight: 24, // Using a hardcoded lineHeight to avoid potential math issues
  },
  actions: {
    marginTop: Spacing.sm,
  },
  buttonsContainer: {
    gap: Spacing.md, // Increased gap for better touch targets
  },
  buttonsRow: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  stackedButton: {
    marginBottom: 0, // Using gap instead
  },
});
