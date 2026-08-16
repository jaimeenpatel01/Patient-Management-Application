import React from 'react';
import { Stack } from 'expo-router';
import { STACK_HEADER_OPTIONS } from '@/constants/theme';

export default function AttendanceLayout() {
  return <Stack screenOptions={STACK_HEADER_OPTIONS} />;
}
