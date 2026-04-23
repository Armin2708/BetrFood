import { API_BASE_URL, authHeaders } from './client';

export async function fetchPreferences() {
  const response = await fetch(`${API_BASE_URL}/api/preferences`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch preferences');
  }
  return response.json();
}

export async function updatePreferences(prefs: {
  dietaryPreferences?: string[];
  allergies?: string[];
  cuisines?: string[];
  profileVisibility?: 'public' | 'private';
  dietaryInfoVisible?: boolean;
  expiringItemsThreshold?: number;
  expirationNotificationsEnabled?: boolean;
  notificationsEnabled?: boolean;
}) {
  const response = await fetch(`${API_BASE_URL}/api/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(prefs),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update preferences');
  }
  return response.json();
}

export async function fetchNotificationPreferences(): Promise<{ notificationsEnabled: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/preferences/notifications`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch notification preferences');
  }
  return response.json();
}

export async function updateNotificationPreferences(
  prefs: { notificationsEnabled: boolean }
): Promise<{ notificationsEnabled: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/preferences/notifications`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(prefs),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update notification preferences');
  }
  return response.json();
}
