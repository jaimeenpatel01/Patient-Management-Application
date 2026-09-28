import React from 'react';
import { Stack } from 'expo-router';
import { STACK_HEADER_OPTIONS } from '@/constants/theme';

export default function WaitlistLayout() {
  return (
    <Stack screenOptions={STACK_HEADER_OPTIONS}>
      <Stack.Screen name="index" options={{ title: 'Waitlist' }} />
      <Stack.Screen name="add" options={{ title: 'Add to Waitlist' }} />
    </Stack>
  );
}
