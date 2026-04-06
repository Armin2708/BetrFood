import { API_BASE_URL, authHeaders } from './client';

export async function checkBlockStatus(userId: string): Promise<{ isBlocked: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/block-status`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check block status');
  }
  const data = response.json();
  console.log('[API] Block status for', userId, ':', data);
  return data;
}

export async function checkMuteStatus(userId: string): Promise<{ isMuted: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/mute-status`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check mute status');
  }
  return response.json();
}

export async function blockUser(userId: string) {
  console.log('[API] Blocking user:', userId);
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/block`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  console.log('[API] Block response status:', response.status);
  const data = await response.json();
  console.log('[API] Block response data:', data);
  if (!response.ok) {
    throw new Error(data.error || 'Failed to block user');
  }
  return data;
}

export async function unblockUser(userId: string) {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/block`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to unblock user');
  }
  return response.json();
}

export async function muteUser(userId: string) {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/mute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to mute user');
  }
  return response.json();
}

export async function unmuteUser(userId: string) {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/mute`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to unmute user');
  }
  return response.json();
}

export async function fetchBlockedUsers() {
  const response = await fetch(`${API_BASE_URL}/api/users/blocked`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch blocked users');
  }
  return response.json();
}

export async function fetchMutedUsers() {
  const response = await fetch(`${API_BASE_URL}/api/users/muted`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch muted users');
  }
  return response.json();
}
