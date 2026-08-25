import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

interface ChipSelectorProps<T extends string> {
  options: { label: string; value: T }[];
  value: T | null;
  onChange: (value: T) => void;
  /** If true, tapping the active chip deselects it (sets null). Default: false */
  allowDeselect?: boolean;
}

function ChipSelectorInner<T extends string>({
  options,
  value,
  onChange,
  allowDeselect = false,
}: ChipSelectorProps<T>) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => {
              if (allowDeselect && value === opt.value) {
                onChange(null as unknown as T);
              } else {
                onChange(opt.value);
              }
            }}
            activeOpacity={0.7}
          >
            {isActive && (
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} style={styles.checkIcon} />
            )}
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export const ChipSelector = React.memo(ChipSelectorInner) as typeof ChipSelectorInner;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    backgroundColor: Colors.primaryFaded,
    borderColor: Colors.primary,
    shadowColor: 'rgba(13, 148, 136, 0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  checkIcon: {
    marginRight: 4,
  },
  chipText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  chipTextActive: {
    color: Colors.primary,
    fontWeight: Typography.semibold,
  },
});
