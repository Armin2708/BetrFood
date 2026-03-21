/**
 * pantryNotifications.ts
 * Handles scheduling and cancelling local expiration notifications
 * for pantry items using expo-notifications.
 *
 * Install if not already present:
 *   npx expo install expo-notifications
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { PantryItem } from '../services/api';

// How many days before expiration to fire the notification
const DEFAULT_THRESHOLD_DAYS = 7;

// Notification identifier prefix — used to cancel by item id
const NOTIF_ID_PREFIX = 'pantry-expiry-';

/**
 * Request notification permissions. Call once on app startup or
 * when the user enables the toggle.
 * Returns true if granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule an expiration notification for a single pantry item.
 * Fires `thresholdDays` before the expiration date at 9:00 AM.
 * Does nothing if:
 *  - notificationsEnabled is false
 *  - item has no expiration date
 *  - the trigger date is in the past
 */
export async function scheduleExpiryNotification(
  item: PantryItem,
  notificationsEnabled: boolean,
  thresholdDays: number = DEFAULT_THRESHOLD_DAYS
): Promise<void> {
  if (!notificationsEnabled || !item.expirationDate) return;
  if (Platform.OS === 'web') return;

  // Cancel any existing notification for this item first
  await cancelExpiryNotification(item.id);

  const expDate = new Date(item.expirationDate);
  expDate.setHours(0, 0, 0, 0);

  // Fire notification at 9 AM, thresholdDays before expiry
  const triggerDate = new Date(expDate);
  triggerDate.setDate(triggerDate.getDate() - thresholdDays);
  triggerDate.setHours(9, 0, 0, 0);

  // Don't schedule if trigger is in the past
  if (triggerDate <= new Date()) return;

  const daysUntilExpiry = Math.round(
    (expDate.getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
  );

  const body =
    daysUntilExpiry === 0
      ? `${item.name} expires today!`
      : daysUntilExpiry === 1
      ? `${item.name} expires tomorrow.`
      : `${item.name} expires in ${daysUntilExpiry} days.`;

  await Notifications.scheduleNotificationAsync({
    identifier: `${NOTIF_ID_PREFIX}${item.id}`,
    content: {
      title: '🧺 Pantry Reminder',
      body,
      data: { itemId: item.id, itemName: item.name },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

/**
 * Schedule notifications for a list of items (batch).
 */
export async function scheduleExpiryNotifications(
  items: PantryItem[],
  notificationsEnabled: boolean,
  thresholdDays: number = DEFAULT_THRESHOLD_DAYS
): Promise<void> {
  await Promise.all(
    items.map((item) =>
      scheduleExpiryNotification(item, notificationsEnabled, thresholdDays)
    )
  );
}

/**
 * Cancel the scheduled notification for a single item.
 */
export async function cancelExpiryNotification(itemId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(
    `${NOTIF_ID_PREFIX}${itemId}`
  );
}

/**
 * Cancel all pantry expiry notifications.
 * Call when notifications are disabled in settings.
 */
export async function cancelAllExpiryNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(NOTIF_ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}
