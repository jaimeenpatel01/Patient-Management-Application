import React from 'react';
import { Stack } from 'expo-router';
import { Colors, Typography } from '@/constants/theme';

export default function PaymentLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTitleStyle: { fontWeight: Typography.semibold, fontSize: Typography.lg, color: Colors.text },
        headerShadowVisible: false,
        headerTintColor: Colors.primary,
      }}
    />
  );
}
