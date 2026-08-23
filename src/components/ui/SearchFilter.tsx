import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

interface SearchFilterProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  debounceMs?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

export const SearchFilter = React.memo(function SearchFilter({ 
  value, 
  onChangeText, 
  placeholder = 'Search...', 
  debounceMs = 300, 
  containerStyle 
}: SearchFilterProps) {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<TextInput>(null);

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
    <Pressable style={[styles.searchBox, containerStyle]} onPress={() => inputRef.current?.focus()}>
      <Ionicons name="search-outline" size={20} color={Colors.textTertiary} />
      <TextInput
        ref={inputRef}
        style={styles.searchInput}
        placeholder={placeholder}
        value={localValue}
        onChangeText={setLocalValue}
        placeholderTextColor={Colors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {localValue.length > 0 ? (
        <TouchableOpacity onPress={() => { setLocalValue(''); onChangeText(''); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.full,
    height: 48,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: Typography.base,
    color: Colors.text,
    marginLeft: Spacing.sm,
    height: '100%',
  },
});
