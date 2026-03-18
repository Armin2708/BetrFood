import { Platform } from 'react-native';
import { API_BASE_URL, authHeaders } from './client';

export interface UserProfile {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  dietaryPreferences: number[];
  onboardingCompleted: boolean;
  verified: boolean;
}

export async function fetchMyProfile(): Promise<UserProfile> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/api/profiles/me`, { headers });
  if (!response.ok) {
    const text = await response.text();
    try {
      const error = JSON.parse(text);
      throw new Error(error.error || 'Failed to fetch profile');
    } catch (e) {
      if (e instanceof SyntaxError) throw new Error(`Failed to fetch profile (HTTP ${response.status})`);
      throw e;
    }
  }
  return response.json();
}

export async function updateMyProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/profiles/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update profile');
  }
  return response.json();
}

export async function uploadAvatar(imageUri: string): Promise<UserProfile> {
  const formData = new FormData();
  const filename = imageUri.split('/').pop() || 'avatar.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  if (Platform.OS === 'web') {
    const resp = await fetch(imageUri);
    const blob = await resp.blob();
    const webFilename = /\.(jpe?g|png|webp)$/i.test(filename) ? filename : 'avatar.jpg';
    const webBlob = blob.type.startsWith('image/')
      ? blob
      : new Blob([blob], { type: 'image/jpeg' });
    formData.append('avatar', webBlob, webFilename);
  } else {
    formData.append('avatar', { uri: imageUri, name: filename, type } as any);
  }

  const response = await fetch(`${API_BASE_URL}/api/profiles/me/avatar`, {
    method: 'POST',
    body: formData,
    headers: { ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload avatar');
  }
  return response.json();
}

export async function completeOnboarding(): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/profiles/me/complete-onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to complete onboarding');
  }
  return response.json();
}

export async function checkUsername(username: string): Promise<{ available: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/profiles/check-username/${encodeURIComponent(username)}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check username');
  }
  return response.json();
}

export async function fetchMyRole(): Promise<{ role: string }> {
  const response = await fetch(`${API_BASE_URL}/api/roles/me`, {
    headers: await authHeaders(),
  });
  if (!response.ok) return { role: 'user' };
  return response.json();
}

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/profiles/${encodeURIComponent(userId)}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch user profile');
  }
  return response.json();
}

export async function deleteAccount() {
  const response = await fetch(`${API_BASE_URL}/api/profiles/me`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete account');
  }
  return response.json();
}
