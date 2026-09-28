import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { changeLanguage, SupportedLanguage } from '@/lib/i18n';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';

interface LanguageOption {
  code: SupportedLanguage;
  labelKey: 'language.english' | 'language.hindi';
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', labelKey: 'language.english' },
  { code: 'hi', labelKey: 'language.hindi' },
];

export default function LanguageScreen() {
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState<SupportedLanguage>(
    (i18n.language as SupportedLanguage) || 'en'
  );

  const handleSelect = async (code: SupportedLanguage) => {
    if (code === selected) return;
    setSelected(code);
    await changeLanguage(code);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.subtitle}>{t('language.subtitle')}</Text>

        <View style={[styles.optionsCard, Shadows.sm]}>
          {LANGUAGE_OPTIONS.map((option, index) => {
            const isSelected = selected === option.code;
            return (
              <React.Fragment key={option.code}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => handleSelect(option.code)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.optionLabel}>{t(option.labelKey)}</Text>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={22} color={Colors.border} />
                  )}
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.base,
  },
  subtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
    marginLeft: Spacing.xs,
  },
  optionsCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.base,
  },
  optionLabel: {
    fontSize: Typography.base,
    fontWeight: Typography.medium,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: Spacing.base,
  },
});
