import { PantryItem } from '../services/api';

export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function scheduleExpiryNotification(
  _item: PantryItem,
  _notificationsEnabled: boolean,
  _thresholdDays: number = 7
): Promise<void> {
  return;
}

export async function scheduleExpiryNotifications(
  _items: PantryItem[],
  _notificationsEnabled: boolean,
  _thresholdDays: number = 7
): Promise<void> {
  return;
}

export async function cancelExpiryNotification(_itemId: string): Promise<void> {
  return;
}

export async function cancelAllExpiryNotifications(): Promise<void> {
  return;
}
