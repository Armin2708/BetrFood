import { API_BASE_URL, authHeaders } from './client';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  data: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export async function fetchNotifications(offset?: number, limit?: number): Promise<{
  notifications: Notification[];
  total: number;
  limit: number;
  offset: number;
}> {
  const params = new URLSearchParams();
  if (offset !== undefined) params.set('offset', String(offset));
  if (limit !== undefined) params.set('limit', String(limit));
  const response = await fetch(`${API_BASE_URL}/api/notifications?${params}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch notifications');
  }
  return response.json();
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const response = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to mark notification as read');
  }
  return response.json();
}

export async function markAllNotificationsRead(): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to mark all notifications as read');
  }
  return response.json();
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch unread notification count');
  }
  const data = await response.json();
  return data.unreadCount;
}
