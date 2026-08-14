import React from 'react';
import { Stack } from 'expo-router';
import { Colors, Typography } from '@/constants/theme';

export default function ConsultationLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTitleStyle: { fontWeight: Typography.semibold, fontSize: Typography.lg, color: Colors.text },
        headerShadowVisible: false,
        headerTintColor: Colors.primary,
      }}
    >
      <Stack.Screen name="[id]" options={{ title: 'Loading...' }} />
      <Stack.Screen name="add" options={{ title: 'Loading...' }} />
    </Stack>
  );
}
