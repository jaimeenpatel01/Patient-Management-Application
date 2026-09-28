/**
 * reminders.ts
 *
 * Local (on-device) push-notification reminders for upcoming appointments.
 * No backend involved — notifications are scheduled directly on the device
 * via expo-notifications and fire even if the app is closed.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Attendance } from '@/types';

const ANDROID_CHANNEL_ID = 'appointment-reminders';
const REMINDERS_ENABLED_KEY = 'reminders_enabled';

let androidChannelReady = false;

/**
 * Whether appointment reminders are enabled (persisted via AsyncStorage).
 * Defaults to enabled when the user hasn't made a choice yet.
 */
export async function getRemindersEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(REMINDERS_ENABLED_KEY);
    return value !== 'false';
  } catch {
    return true;
  }
}

export async function setRemindersEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(REMINDERS_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {
    // Non-critical — the in-memory toggle state still reflects the user's choice this session.
  }
}

/** Creates the Android notification channel (required on Android 8+). No-op on iOS / web. */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android' || androidChannelReady) return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Appointment Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
    androidChannelReady = true;
  } catch {
    // Non-critical — scheduling will still work without a custom channel on most devices.
  }
}

/**
 * Requests notification permission if not already granted.
 * Returns true if the app is allowed to schedule/display notifications.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    await ensureAndroidChannel();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Schedules a local notification reminding the doctor about an attendance
 * (appointment) a given number of hours before it's due.
 *
 * Returns the scheduled notification id, or null if:
 * - notification permission wasn't granted
 * - the reminder time has already passed
 * - scheduling failed for any reason
 */
export async function scheduleAttendanceReminder(
  attendance: Attendance,
  hoursBefore: number,
): Promise<string | null> {
  try {
    const enabled = await getRemindersEnabled();
    if (!enabled) return null;

    const granted = await requestNotificationPermission();
    if (!granted) return null;

    const appointmentDate = new Date(`${attendance.attendance_date}T${attendance.attendance_time}`);
    if (isNaN(appointmentDate.getTime())) return null;

    const triggerDate = new Date(appointmentDate.getTime() - hoursBefore * 60 * 60 * 1000);
    if (triggerDate.getTime() <= Date.now()) return null;

    const patientName = attendance.patient?.full_name || 'your patient';
    const hourLabel = hoursBefore === 1 ? '1 hour' : `${hoursBefore} hours`;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Upcoming Appointment',
        body: `Appointment with ${patientName} in ${hourLabel}.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: ANDROID_CHANNEL_ID,
      },
    });

    return notificationId;
  } catch {
    return null;
  }
}

/** Cancels a previously scheduled attendance reminder. Safe to call even if already fired/cancelled. */
export async function cancelAttendanceReminder(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Non-critical — notification may have already fired or been cancelled.
  }
}
