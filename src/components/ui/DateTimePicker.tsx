import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

interface CustomDateTimePickerProps {
  label?: string;
  value: string; // YYYY-MM-DD or HH:MM
  onChange: (val: string) => void;
  mode?: 'date' | 'time';
  error?: string;
}

export function AppDateTimePicker({ label, value, onChange, mode = 'date', error }: CustomDateTimePickerProps) {
  const [show, setShow] = useState(false);

  // Convert string to Date
  const parseDate = () => {
    if (!value) return new Date();
    if (mode === 'date') {
      const [y, m, d] = value.split('-');
      if (y && m && d) {
        return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
      }
    } else {
      const [h, min] = value.split(':');
      if (h && min) {
        const d = new Date();
        d.setHours(parseInt(h, 10));
        d.setMinutes(parseInt(min, 10));
        return d;
      }
    }
    return new Date();
  };

  const formatDate = (date: Date) => {
    if (mode === 'date') {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    } else {
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${h}:${min}`;
    }
  };

  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }
    if (selectedDate) {
      onChange(formatDate(selectedDate));
    }
  };

  const displayValue = value || (mode === 'date' ? 'YYYY-MM-DD' : 'HH:MM');

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.trigger, error ? styles.triggerError : null]}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={20} color={Colors.textTertiary} />
        <Text style={[styles.valueText, !value && styles.placeholderText]}>{displayValue}</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Android uses a native dialog implicitly when rendered */}
      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={parseDate()}
          mode={mode}
          display="default"
          onChange={handleChange}
        />
      )}

      {/* iOS typically needs a modal + done button for the spinner */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShow(false)} style={styles.doneButton}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={parseDate()}
                mode={mode}
                display="spinner"
                onChange={handleChange}
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  triggerError: {
    borderColor: Colors.error,
  },
  valueText: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: Typography.base,
    color: Colors.text,
  },
  placeholderText: {
    color: Colors.textTertiary,
  },
  errorText: {
    fontSize: Typography.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerContainer: {
    backgroundColor: Colors.surface,
    paddingBottom: Spacing.xl,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surfaceSecondary,
  },
  doneButton: {
    paddingHorizontal: Spacing.md,
  },
  doneText: {
    color: Colors.primary,
    fontSize: Typography.base,
    fontWeight: Typography.bold,
  },
  iosPicker: {
    height: 200,
  },
});
