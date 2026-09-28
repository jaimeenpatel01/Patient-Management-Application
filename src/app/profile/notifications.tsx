import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { getRemindersEnabled, setRemindersEnabled, requestNotificationPermission } from '@/lib/reminders';

export default function NotificationsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [remindersEnabled, setRemindersEnabledState] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      getRemindersEnabled().then((enabled) => {
        if (!cancelled) {
          setRemindersEnabledState(enabled);
          setIsLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const handleToggle = async (value: boolean) => {
    setRemindersEnabledState(value);
    setIsSaving(true);
    await setRemindersEnabled(value);
    if (value) {
      // Prompt for permission right away so the toggle feels responsive.
      await requestNotificationPermission();
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.card, Shadows.sm]}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={styles.iconBg}>
              <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.textGroup}>
              <Text style={styles.rowTitle}>Appointment Reminders</Text>
              <Text style={styles.rowSubtitle}>
                Get a local reminder 2 hours before each appointment.
              </Text>
            </View>
          </View>
          <Switch
            value={remindersEnabled}
            onValueChange={handleToggle}
            disabled={isSaving}
            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
            thumbColor={remindersEnabled ? Colors.primary : Colors.surface}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.base,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.md,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  textGroup: {
    flex: 1,
  },
  rowTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.medium,
    color: Colors.text,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
});
