import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.chip, value === opt.value && styles.chipActive]}
          onPress={() => {
            if (allowDeselect && value === opt.value) {
              onChange(null as unknown as T);
            } else {
              onChange(opt.value);
            }
          }}
        >
          <Text style={[styles.chipText, value === opt.value && styles.chipTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
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
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    backgroundColor: Colors.primaryFaded,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  chipTextActive: {
    color: Colors.primary,
  },
});
