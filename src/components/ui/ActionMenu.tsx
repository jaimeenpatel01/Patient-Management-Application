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
            <SafeAreaView edges={['bottom']} style={[styles.menuContainer, { paddingBottom: Spacing.xl }]}>
              {/* Drag handle pill */}
              <View style={styles.dragHandleContainer}>
                <View style={styles.dragHandle} />
              </View>

              {title && (
                <View style={styles.header}>
                  <Text style={styles.title}>{title}</Text>
                </View>
              )}
              {options.map((option, index) => {
                const iconBg = option.color
                  ? `${option.color}15`
                  : Colors.primaryFaded;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.optionRow, index === options.length - 1 && styles.lastOptionRow]}
                    activeOpacity={0.6}
                    onPress={option.onPress}
                  >
                    <View style={[styles.optionIconBg, { backgroundColor: iconBg }]}>
                      <Ionicons name={option.icon} size={20} color={option.color || Colors.primary} />
                    </View>
                    <Text style={[styles.optionLabel, { color: option.color || Colors.text }]}>
                      {option.label}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                  </TouchableOpacity>
                );
              })}

              <View style={styles.cancelSeparator} />

              <TouchableOpacity style={styles.cancelButton} activeOpacity={0.6} onPress={onClose}>
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
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    ...Shadows.xl,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.disabled,
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
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  lastOptionRow: {
    borderBottomWidth: 0,
  },
  optionIconBg: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLabel: {
    flex: 1,
    fontSize: Typography.base,
    fontWeight: Typography.medium,
    marginLeft: Spacing.md,
  },
  cancelSeparator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginTop: Spacing.sm,
  },
  cancelButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.surfaceSecondary,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
  },
});
