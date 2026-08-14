import React from 'react';
import { Stack } from 'expo-router';
import { Colors, Typography } from '@/constants/theme';

export default function PatientLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTitleStyle: {
          fontWeight: Typography.semibold,
          fontSize: Typography.lg,
          color: Colors.text,
        },
        headerShadowVisible: false,
        headerTintColor: Colors.primary,
      }}
    >
      <Stack.Screen name="[id]/index" options={{ title: 'Loading...' }} />
      <Stack.Screen name="[id]/consultations" options={{ title: 'Loading...' }} />
      <Stack.Screen name="[id]/documents" options={{ title: 'Loading...' }} />
      <Stack.Screen name="add" options={{ title: 'Add Patient' }} />
      <Stack.Screen name="edit/[id]" options={{ title: 'Loading...' }} />
      <Stack.Screen name="summary/[id]" options={{ title: 'Loading...' }} />
    </Stack>
  );
}
