import React from 'react';
import { Stack } from 'expo-router';
import { STACK_HEADER_OPTIONS } from '@/constants/theme';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={STACK_HEADER_OPTIONS}>
      <Stack.Screen name="personal-info" options={{ title: 'Personal Information' }} />
      <Stack.Screen name="change-password" options={{ title: 'Change Password' }} />
      <Stack.Screen name="help-support" options={{ title: 'Help & Support' }} />
      <Stack.Screen name="about" options={{ title: 'About PhysioDesk' }} />
    </Stack>
  );
}
