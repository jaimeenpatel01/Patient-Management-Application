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
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { SearchFilter } from '@/components/ui/SearchFilter';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getInitials } from '@/lib/formatters';

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
 * Renders a tappable trigger that opens a rich bottom-sheet style modal 
 * where the user can search for and select a patient.
 */
export function PatientSearchPicker({
  patients,
  loading = false,
  value,
  onSelect,
  onClear,
  error,
  style,
  placeholder = 'Select a patient',
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
          <View style={styles.selectedAvatar}>
            <Text style={styles.selectedAvatarText}>{getInitials(selectedPatient.full_name)}</Text>
          </View>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedName}>{selectedPatient.full_name}</Text>
            {selectedPatient.phone && (
              <Text style={styles.selectedPhone}>{selectedPatient.phone}</Text>
            )}
          </View>
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <View style={styles.clearButtonBg}>
              <Ionicons name="close" size={16} color={Colors.textTertiary} />
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.trigger, error ? styles.triggerError : null, style]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.75}
        >
          <View style={styles.triggerIconBg}>
            <Ionicons name="person-outline" size={18} color={Colors.primary} />
          </View>
          <Text style={styles.triggerPlaceholder}>{placeholder}</Text>
          <Ionicons name="chevron-down" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Rich Popup Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          setSearchQuery('');
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => {
            setModalVisible(false);
            setSearchQuery('');
          }}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          
          <SafeAreaView edges={['bottom']} style={styles.modalContainer}>
            {/* Drag Handle */}
            <View style={styles.dragHandleContainer}>
              <View style={styles.dragHandle} />
            </View>

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Patient</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSearchQuery('');
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search box */}
            <View style={styles.searchWrapper}>
              <SearchFilter
                placeholder="Search patient name"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Results */}
            {loading ? (
              <View style={styles.stateContainer}>
                 <Text style={styles.stateText}>Loading patients...</Text>
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(p) => p.id}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = value === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.listItem, isSelected && styles.listItemActive]}
                      onPress={() => handleSelect(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.avatar, isSelected && styles.avatarActive]}>
                        <Text style={[styles.avatarText, isSelected && styles.avatarTextActive]}>
                          {getInitials(item.full_name)}
                        </Text>
                      </View>
                      
                      <View style={styles.listItemInfo}>
                        <Text style={[styles.listItemName, isSelected && styles.listItemNameActive]}>
                          {item.full_name}
                        </Text>
                        {item.phone ? (
                          <Text style={[styles.listItemSub, isSelected && styles.listItemSubActive]}>{item.phone}</Text>
                        ) : null}
                      </View>
                      
                      {isSelected ? (
                        <View style={styles.checkIconBg}>
                          <Ionicons name="checkmark" size={16} color={Colors.textInverse} />
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.stateContainer}>
                    <View style={styles.emptyIconBg}>
                      <Ionicons name="search-outline" size={32} color={Colors.primary} />
                    </View>
                    <Text style={styles.emptyTitle}>No patients found</Text>
                    <Text style={styles.emptySubtitle}>
                      {searchQuery.trim().length > 0 
                        ? 'Try a different search term.' 
                        : 'You haven\'t added any patients yet.'}
                    </Text>
                  </View>
                }
              />
            )}
          </SafeAreaView>
        </KeyboardAvoidingView>
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
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  triggerIconBg: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerError: {
    borderColor: Colors.error,
  },
  triggerPlaceholder: {
    flex: 1,
    marginLeft: Spacing.md,
    fontSize: Typography.base,
    color: Colors.textTertiary,
  },

  // Selected patient row
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.sm,
    shadowColor: Colors.primary,
  },
  selectedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedAvatarText: {
    color: Colors.primary,
    fontWeight: Typography.bold,
    fontSize: Typography.base,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.primaryDark,
  },
  selectedPhone: {
    fontSize: Typography.xs,
    color: Colors.primary,
    marginTop: 2,
  },
  clearButtonBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorText: {
    fontSize: Typography.sm,
    color: Colors.error,
    marginTop: Spacing.xs,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    maxHeight: '85%',
    ...Shadows.xl,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.disabled,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrapper: {
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  listContent: {
    paddingBottom: Spacing['4xl'],
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xs,
  },
  listItemActive: {
    backgroundColor: Colors.primaryFaded,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarActive: {
    backgroundColor: Colors.surface,
  },
  avatarText: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textSecondary,
  },
  avatarTextActive: {
    color: Colors.primary,
  },
  listItemInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  listItemName: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  listItemNameActive: {
    color: Colors.primaryDark,
  },
  listItemSub: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  listItemSubActive: {
    color: Colors.primary,
  },
  checkIconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  stateContainer: {
    paddingVertical: Spacing['4xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    fontSize: Typography.sm,
    color: Colors.textTertiary,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
