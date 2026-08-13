import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

interface SearchFilterProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  debounceMs?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

export function SearchFilter({ 
  value, 
  onChangeText, 
  placeholder = 'Search...', 
  debounceMs = 300, 
  containerStyle 
}: SearchFilterProps) {
  const [localValue, setLocalValue] = useState(value);

  // Sync if outer value changes (e.g. cleared externally)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce the callback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChangeText(localValue);
      }
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChangeText, value]);

  return (
    <View style={[styles.searchBox, containerStyle]}>
      <Ionicons name="search-outline" size={20} color={Colors.textTertiary} />
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        value={localValue}
        onChangeText={setLocalValue}
        placeholderTextColor={Colors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {localValue.length > 0 ? (
        <TouchableOpacity onPress={() => { setLocalValue(''); onChangeText(''); }}>
          <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 44,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: Typography.base,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
});
