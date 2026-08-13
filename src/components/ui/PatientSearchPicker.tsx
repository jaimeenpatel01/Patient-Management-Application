import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { SearchFilter } from '@/components/ui/SearchFilter';
import type { Patient } from '@/types';

interface PatientSearchPickerProps {
  /** All available patients to search through */
  patients: Patient[];
  /** Whether the patient list is still loading */
  loading?: boolean;
  /** Currently selected patient id */
  value: string | null;
  /** Called when the user selects a patient */
  onSelect: (patient: Patient) => void;
  /** Called when the user clears the selection */
  onClear?: () => void;
  /** Validation error message */
  error?: string;
  /** Style overrides for the trigger container */
  style?: StyleProp<ViewStyle>;
  /** Optional placeholder text for the trigger button */
  placeholder?: string;
}

/**
 * A reusable patient search picker.
 *
 * Renders a tappable trigger that opens a modal where the user can
 * search for and select a patient. Once selected, the trigger shows
 * the patient's name and a clear button.
 */
export function PatientSearchPicker({
  patients,
  loading = false,
  value,
  onSelect,
  onClear,
  error,
  style,
  placeholder = 'Select a patient...',
}: PatientSearchPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedPatient = value ? patients.find((p) => p.id === value) : null;

  const filtered = patients.filter((p) =>
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (patient: Patient) => {
    setModalVisible(false);
    setSearchQuery('');
    onSelect(patient);
  };

  const handleClear = () => {
    onClear?.();
  };

  return (
    <>
      {/* Trigger */}
      {selectedPatient ? (
        <View style={[styles.selectedRow, style]}>
          <Ionicons name="person-circle-outline" size={22} color={Colors.primary} />
          <Text style={styles.selectedName}>{selectedPatient.full_name}</Text>
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={22} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.trigger, error ? styles.triggerError : null, style]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.75}
        >
          <Text style={styles.triggerPlaceholder}>{placeholder}</Text>
          <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Search Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setModalVisible(false);
          setSearchQuery('');
        }}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Patient</Text>
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                setSearchQuery('');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search box */}
          <View style={styles.searchWrapper}>
            <SearchFilter
              placeholder="Search patients..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              containerStyle={{ borderWidth: 0, paddingHorizontal: 0, height: 'auto', backgroundColor: 'transparent' }}
            />
          </View>

          {/* Results */}
          {loading ? (
            <Text style={styles.stateText}>Loading patients...</Text>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(p) => p.id}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.listItem, value === item.id && styles.listItemActive]}
                  onPress={() => handleSelect(item)}
                >
                  <Ionicons
                    name="person-circle-outline"
                    size={24}
                    color={value === item.id ? Colors.primary : Colors.textSecondary}
                  />
                  <View style={styles.listItemInfo}>
                    <Text style={[styles.listItemName, value === item.id && styles.listItemNameActive]}>
                      {item.full_name}
                    </Text>
                    {item.phone ? (
                      <Text style={styles.listItemSub}>{item.phone}</Text>
                    ) : null}
                  </View>
                  {value === item.id ? (
                    <Ionicons name="checkmark" size={20} color={Colors.primary} style={{ marginLeft: 'auto' }} />
                  ) : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.stateText}>
                  {searchQuery.trim().length > 0 ? 'No patients found.' : 'Start typing to search...'}
                </Text>
              }
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Trigger – no selection yet
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  triggerError: {
    borderColor: Colors.error,
  },
  triggerPlaceholder: {
    fontSize: Typography.base,
    color: Colors.textTertiary,
  },

  // Selected patient row
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryFaded,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  selectedName: {
    flex: 1,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.primary,
  },

  errorText: {
    fontSize: Typography.sm,
    color: Colors.error,
    marginTop: Spacing.xs,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  modalTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text,
  },
  searchWrapper: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base,
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  listContent: {
    paddingBottom: Spacing['4xl'],
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  listItemActive: {
    backgroundColor: Colors.primaryFaded,
  },
  listItemInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  listItemName: {
    fontSize: Typography.base,
    color: Colors.text,
  },
  listItemNameActive: {
    color: Colors.primary,
    fontWeight: Typography.semibold,
  },
  listItemSub: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  stateText: {
    fontSize: Typography.sm,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
});
