import { Platform } from 'react-native';
import { UserPreferences } from '../constants/preferenceData';

const LOCAL_IP = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:3000`;

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
  imagePaths?: string[];
  videoPath?: string | null;
  videoType?: string | null;
  createdAt: string;
  updatedAt: string;
  editedAt?: string | null;
  recipe?: Recipe | null;
  tags?: Tag[];
}

export interface PaginatedResponse {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
  restricted?: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isPrivate: boolean;
  preferences: UserPreferences;
  postCount: number;
  followerCount: number;
  followingCount: number;
}

export interface Report {
  id: string;
  postId: string;
  reporterId: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export type FeedMode = 'for_you' | 'following';

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}`);
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to fetch user profile'); }
  return response.json();
}

export async function updateUserProfile(
  userId: string,
  updates: { username?: string; displayName?: string | null; bio?: string | null; avatarUrl?: string; isPrivate?: boolean }
): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to update user profile'); }
  return response.json();
}

export async function fetchUserPreferences(userId: string): Promise<UserPreferences> {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/preferences`);
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to fetch preferences'); }
  return response.json();
}

export async function updateUserPreferences(userId: string, preferences: UserPreferences): Promise<UserPreferences> {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences),
  });
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to update preferences'); }
  return response.json();
}

export async function fetchUserPosts(
  userId: string,
  cursor?: string | null,
  limit: number = 12,
  requesterId?: string
): Promise<PaginatedResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  if (requesterId) params.set('requesterId', requesterId);
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/posts?${params}`);
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to fetch user posts'); }
  return response.json();
}

export async function fetchFollowStatus(userId: string, requesterId: string): Promise<{ isFollowing: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/follow-status?requesterId=${requesterId}`);
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to fetch follow status'); }
  return response.json();
}

export async function followUser(userId: string, followerId: string): Promise<{ isFollowing: boolean; followerCount: number }> {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ followerId }),
  });
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to follow user'); }
  return response.json();
}

export async function unfollowUser(userId: string, followerId: string): Promise<{ isFollowing: boolean; followerCount: number }> {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/follow`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ followerId }),
  });
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to unfollow user'); }
  return response.json();
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function submitReport(data: {
  postId: string;
  reporterId: string;
  reason: string;
  description?: string | null;
}): Promise<Report> {
  const response = await fetch(`${API_BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to submit report'); }
  return response.json();
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

export async function fetchFeed(
  userId: string,
  cursor?: string | null,
  limit: number = 10,
  tagIds: number[] = [],
  mode: FeedMode = 'for_you'
): Promise<PaginatedResponse> {
  const params = new URLSearchParams({ userId, limit: String(limit), mode });
  if (cursor) params.set('cursor', cursor);
  if (tagIds.length > 0) params.set('tags', tagIds.join(','));
  const response = await fetch(`${API_BASE_URL}/api/feed?${params}`);
  if (response.status === 404) return fetchPosts(cursor, limit);
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to fetch feed'); }
  return response.json();
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export async function fetchPosts(cursor?: string | null, limit: number = 10): Promise<PaginatedResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const response = await fetch(`${API_BASE_URL}/api/posts?${params}`);
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to fetch posts'); }
  return response.json();
}

export async function fetchPost(postId: string): Promise<Post> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`);
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to fetch post'); }
  return response.json();
}

export async function createPostApi(
  imageUris: string[],
  caption: string,
  userId: string = 'current-user',
  recipe?: RecipeInput | null,
  videoUri?: string | null
): Promise<Post> {
  const formData = new FormData();
  formData.append('caption', caption);
  formData.append('userId', userId);
  if (recipe) formData.append('recipe', JSON.stringify(recipe));

  imageUris.forEach((uri) => {
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('images', { uri, name: filename, type } as any);
  });

  if (videoUri) {
    const filename = videoUri.split('/').pop() || 'video.mp4';
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : 'mp4';
    const type = ext === 'mov' ? 'video/quicktime' : `video/${ext}`;
    formData.append('video', { uri: videoUri, name: filename, type } as any);
  }

  const response = await fetch(`${API_BASE_URL}/api/posts`, {
    method: 'POST',
    body: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to create post'); }
  return response.json();
}

export function getImageUrl(imagePath: string): string {
  return `${API_BASE_URL}${imagePath}`;
}

export async function deletePost(postId: string, userId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
  });
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to delete post'); }
  return response.json();
}

export async function updatePost(postId: string, userId: string, updates: { caption?: string }): Promise<Post> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(updates),
  });
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to update post'); }
  return response.json();
}

export async function fetchRecipe(postId: string): Promise<Recipe> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/recipe`);
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to fetch recipe'); }
  return response.json();
}

export async function updateRecipe(postId: string, recipe: RecipeInput): Promise<Recipe> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/recipe`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipe),
  });
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to update recipe'); }
  return response.json();
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export async function fetchTags(type?: string): Promise<Tag[]> {
  const response = await fetch(`${API_BASE_URL}/api/tags${type ? `?type=${type}` : ''}`);
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to fetch tags'); }
  return response.json();
}

export async function addTagsToPost(postId: string, tagIds: number[]): Promise<{ postId: string; tags: Tag[] }> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tagIds }),
  });
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to add tags'); }
  return response.json();
}

export async function removeTagFromPost(postId: string, tagId: number): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/tags/${tagId}`, { method: 'DELETE' });
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to remove tag'); }
  return response.json();
}

export async function fetchPostTags(postId: string): Promise<Tag[]> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/tags`);
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to fetch post tags'); }
  return response.json();
}

export async function fetchPostsByTags(tagIds: number[]): Promise<Post[]> {
  const response = await fetch(`${API_BASE_URL}/api/posts/by-tags?tags=${tagIds.join(',')}`);
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to filter posts'); }
  return response.json();
}
