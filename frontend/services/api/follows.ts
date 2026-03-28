import { API_BASE_URL, authHeaders } from './client';

export async function followUser(userId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to follow user');
  }
  return response.json();
}

export async function unfollowUser(userId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/follow`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to unfollow user');
  }
  return response.json();
}

export async function checkFollowStatus(userId: string): Promise<{ isFollowing: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/follow-status`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check follow status');
  }
  return response.json();
}

export async function fetchFollowStats(userId: string): Promise<{ userId: string; followerCount: number; followingCount: number }> {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/follow-stats`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch follow stats');
  }
  return response.json();
}

export type FollowerUser = {
  id: string;
  username: string;
  name: string;
  avatar: string;
  isFollowingBack: boolean;
};

export type FollowingUser = {
  id: string;
  username: string;
  name: string;
  avatar: string;
  isFollowing: boolean;
};

export async function fetchFollowers(userId: string): Promise<FollowerUser[]> {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/followers`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch followers');
  }
  return response.json();
}

export async function fetchFollowing(userId: string): Promise<FollowingUser[]> {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/following`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch following');
  }
  return response.json();
}
