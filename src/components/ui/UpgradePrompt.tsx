import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { Button } from './Button';

interface UpgradePromptProps {
  title: string;
  subtitle?: string;
}

export const UpgradePrompt = React.memo(function UpgradePrompt({ title, subtitle }: UpgradePromptProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="lock-closed-outline" size={40} color={Colors.primary} />
      </View>
      <View style={styles.proPill}>
        <Text style={styles.proPillText}>PRO</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        {subtitle ?? 'Upgrade to PhysioDesk Pro to unlock this feature.'}
      </Text>
      <View style={styles.actionContainer}>
        <Button
          title="Upgrade to Pro"
          onPress={() => router.push('/profile/subscription' as any)}
          variant="primary"
          size="sm"
          fullWidth={false}
        />
      </View>
    </View>
  );
});

export const ProPill = React.memo(function ProPill() {
  return (
    <View style={[styles.proPill, styles.inlinePill]}>
      <Text style={styles.proPillText}>PRO</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing['4xl'],
    backgroundColor: Colors.background,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  proPill: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginBottom: Spacing.md,
    alignSelf: 'center',
  },
  inlinePill: {
    marginBottom: 0,
  },
  proPillText: {
    color: Colors.textInverse,
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
    lineHeight: Typography.sm * Typography.normal,
  },
  actionContainer: {
    marginTop: Spacing.xl,
  },
});
