import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ActionMenuOption {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress: () => void;
}

interface ActionMenuProps {
  visible: boolean;
  onClose: () => void;
  options: ActionMenuOption[];
  title?: string;
}

export const ActionMenu = React.memo(function ActionMenu({ visible, onClose, options, title }: ActionMenuProps) {

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <SafeAreaView edges={['bottom']} style={[styles.menuContainer, { paddingBottom: Spacing.lg }]}>
              {title && (
                <View style={styles.header}>
                  <Text style={styles.title}>{title}</Text>
                </View>
              )}
              {options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.optionRow, index === options.length - 1 && styles.lastOptionRow]}
                  activeOpacity={0.7}
                  onPress={option.onPress}
                >
                  <Ionicons name={option.icon} size={22} color={option.color || Colors.text} />
                  <Text style={[styles.optionLabel, { color: option.color || Colors.text }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.cancelButton} activeOpacity={0.7} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    ...Shadows.lg,
  },
  header: {
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  lastOptionRow: {
    borderBottomWidth: 0,
  },
  optionLabel: {
    fontSize: Typography.base,
    fontWeight: Typography.medium,
    marginLeft: Spacing.md,
  },
  cancelButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.surfaceSecondary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.text,
  },
});
