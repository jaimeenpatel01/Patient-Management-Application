import React from 'react';
import { Stack } from 'expo-router';
import { STACK_HEADER_OPTIONS } from '@/constants/theme';

export default function ConsultationLayout() {
  return (
    <Stack screenOptions={STACK_HEADER_OPTIONS}>
      <Stack.Screen name="[id]" options={{ title: 'Loading...' }} />
      <Stack.Screen name="add" options={{ title: 'Loading...' }} />
    </Stack>
  );
}
