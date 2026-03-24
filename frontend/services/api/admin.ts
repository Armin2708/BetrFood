import { API_BASE_URL, authHeaders } from './client';

export interface AdminUser {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  verified: boolean;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  usersByRole: Record<string, number>;
}

export async function fetchAdminUsers(page: number = 1, limit: number = 20): Promise<{
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}> {
  const params = new URLSearchParams({ offset: String((page - 1) * limit), limit: String(limit) });
  const response = await fetch(`${API_BASE_URL}/api/admin/users?${params}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch admin users');
  }
  return response.json();
}

export async function updateUserRole(userId: string, role: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${encodeURIComponent(userId)}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ role }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update user role');
  }
  return response.json();
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch admin stats');
  }
  return response.json();
}

export async function updateUserVerification(userId: string, verified: boolean): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${encodeURIComponent(userId)}/verify`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ verified }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update user verification');
  }
  return response.json();
}
