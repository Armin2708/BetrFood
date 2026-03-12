import { Platform } from 'react-native';

const LOCAL_IP = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:3000`;

// Token storage - set by AuthContext
let _authToken: string | null = null;
let _getTokenFn: (() => Promise<string | null>) | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

export function setTokenGetter(fn: (() => Promise<string | null>) | null) {
  _getTokenFn = fn;
}

async function getFreshToken(): Promise<string | null> {
  if (_getTokenFn) {
    try {
      const token = await _getTokenFn();
      if (token) {
        _authToken = token;
        return token;
      }
    } catch {
      // Fall back to cached token
    }
  }
  return _authToken;
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const token = await getFreshToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface RecipeIngredient {
  id: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  orderIndex: number;
}

export interface RecipeStep {
  id: string;
  stepNumber: number;
  instruction: string;
}

export interface Recipe {
  id: string;
  postId: string;
  cookTime: number | null;
  servings: number | null;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

export interface RecipeInput {
  cookTime?: number | null;
  servings?: number | null;
  difficulty?: 'easy' | 'medium' | 'hard';
  ingredients?: Array<{ name: string; quantity?: string; unit?: string }>;
  steps?: Array<{ instruction: string }>;
}

export interface Tag {
  id: number;
  name: string;
  type: 'cuisine' | 'meal' | 'dietary';
}

export interface Post {
  id: string;
  userId: string;
  caption: string;
  imagePath: string;
  createdAt: string;
  updatedAt: string;
  editedAt?: string | null;
  recipe?: Recipe | null;
  tags?: Tag[];
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
}

export interface PaginatedResponse {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function fetchPosts(cursor?: string | null, limit: number = 10): Promise<PaginatedResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const response = await fetch(`${API_BASE_URL}/api/posts?${params}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch posts');
  }
  return response.json();
}

export async function fetchUserPosts(userId: string, limit: number = 30): Promise<{ posts: Post[] }> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/api/posts/user/${userId}?limit=${limit}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch user posts');
  return res.json();
}

export async function fetchPost(postId: string): Promise<Post> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch post');
  }
  return response.json();
}

export async function createPostApi(
  imageUri: string,
  caption: string,
  recipe?: RecipeInput | null
): Promise<Post> {
  const formData = new FormData();
  const filename = imageUri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('image', {
    uri: imageUri,
    name: filename,
    type,
  } as any);
  formData.append('caption', caption);

  if (recipe) {
    formData.append('recipe', JSON.stringify(recipe));
  }

  const response = await fetch(`${API_BASE_URL}/api/posts`, {
    method: 'POST',
    body: formData,
    headers: {
      ...(await authHeaders()),
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create post');
  }

  return response.json();
}

export function getImageUrl(imagePath: string): string {
  return `${API_BASE_URL}${imagePath}`;
}

export async function deletePost(postId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete post');
  }
  return response.json();
}

export async function updatePost(
  postId: string,
  updates: { caption?: string }
): Promise<Post> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update post');
  }
  return response.json();
}

export async function fetchRecipe(postId: string): Promise<Recipe> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/recipe`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch recipe');
  }
  return response.json();
}

export async function createRecipe(postId: string, recipe: RecipeInput): Promise<Recipe> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/recipe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(recipe),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create recipe');
  }
  return response.json();
}

export async function updateRecipe(postId: string, recipe: RecipeInput): Promise<Recipe> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/recipe`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(recipe),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update recipe');
  }
  return response.json();
}

// Tag API functions

export async function fetchTags(type?: string): Promise<Tag[]> {
  const params = type ? `?type=${type}` : '';
  const response = await fetch(`${API_BASE_URL}/api/tags${params}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch tags');
  }
  return response.json();
}

export async function addTagsToPost(postId: string, tagIds: number[]): Promise<{ postId: string; tags: Tag[] }> {
  const response = await fetch(`${API_BASE_URL}/api/tags/posts/${postId}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ tagIds }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add tags');
  }
  return response.json();
}

export async function removeTagFromPost(postId: string, tagId: number): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/tags/posts/${postId}/tags/${tagId}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove tag');
  }
  return response.json();
}

export async function fetchPostTags(postId: string): Promise<Tag[]> {
  const response = await fetch(`${API_BASE_URL}/api/tags/posts/${postId}/tags`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch post tags');
  }
  return response.json();
}

export async function fetchPostsByTags(tagIds: number[]): Promise<Post[]> {
  const response = await fetch(`${API_BASE_URL}/api/tags/posts/by-tags?tags=${tagIds.join(',')}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to filter posts');
  }
  return response.json();
}

// Profile API functions

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
  const response = await fetch(`${API_BASE_URL}/api/profiles/me`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch profile');
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

// Role API functions

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

// Like API functions

export async function likePost(postId: string): Promise<{ likes: number }> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to like post');
  }
  return response.json();
}

export async function unlikePost(postId: string): Promise<{ likes: number }> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to unlike post');
  }
  return response.json();
}

// Delete recipe

export async function deleteRecipe(postId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/recipe`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete recipe');
  }
  return response.json();
}

// Follow API functions

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

// Report API functions

export async function reportContent(targetType: string, targetId: string, reason: string) {
  const response = await fetch(`${API_BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ targetType, targetId, reason }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to report content');
  }
  return response.json();
}

// Save/Bookmark API functions

export async function savePost(postId: string) {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save post');
  }
  return response.json();
}

export async function unsavePost(postId: string) {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/save`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to unsave post');
  }
  return response.json();
}

export async function checkSaveStatus(postId: string): Promise<{ isSaved: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/save-status`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check save status');
  }
  return response.json();
}

export async function fetchCollections() {
  const response = await fetch(`${API_BASE_URL}/api/collections`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch collections');
  }
  return response.json();
}

export async function createCollection(name: string) {
  const response = await fetch(`${API_BASE_URL}/api/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create collection');
  }
  return response.json();
}

export async function deleteCollection(id: string) {
  const response = await fetch(`${API_BASE_URL}/api/collections/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete collection');
  }
  return response.json();
}

export async function addPostToCollection(collectionId: string, postId: string) {
  const response = await fetch(`${API_BASE_URL}/api/collections/${collectionId}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ postId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add post to collection');
  }
  return response.json();
}

export async function removePostFromCollection(collectionId: string, postId: string) {
  const response = await fetch(`${API_BASE_URL}/api/collections/${collectionId}/posts/${postId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove post from collection');
  }
  return response.json();
}

export async function fetchCollectionPosts(collectionId: string) {
  const response = await fetch(`${API_BASE_URL}/api/collections/${collectionId}/posts`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch collection posts');
  }
  return response.json();
}

// Following Feed API

export async function fetchFollowingFeed(cursor?: string | null, limit: number = 10): Promise<PaginatedResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const response = await fetch(`${API_BASE_URL}/api/posts/following?${params}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch following feed');
  }
  return response.json();
}

// Preferences API functions

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

// Account Deletion

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

// Notification API functions

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

// Comment API functions

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  replies?: Comment[];
}

export async function fetchComments(
  postId: string,
  offset: number = 0,
  limit: number = 20
): Promise<{ comments: Comment[]; total: number }> {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments?${params}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch comments');
  }
  return response.json();
}

export async function createComment(
  postId: string,
  content: string,
  parentId?: string
): Promise<Comment> {
  const body: Record<string, string> = { content };
  if (parentId) body.parentId = parentId;
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create comment');
  }
  return response.json();
}

export async function deleteComment(commentId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/comments/${commentId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete comment');
  }
  return response.json();
}

// Block & Mute API functions

export async function blockUser(userId: string) {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/block`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to block user');
  }
  return response.json();
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

// Admin API functions

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
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
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
