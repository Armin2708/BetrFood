import { Platform } from 'react-native';

const LOCAL_IP = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:3000`;

export interface Post {
  id: string;
  userId: string;
  caption: string;
  imagePath: string;
  createdAt: string;
  updatedAt: string;
  editedAt?: string | null;
}

export interface PaginatedResponse {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function fetchPosts(cursor?: string | null, limit: number = 10): Promise<PaginatedResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const response = await fetch(`${API_BASE_URL}/api/posts?${params}`);
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to fetch posts'); }
  return response.json();
}

export async function createPostApi(imageUri: string, caption: string, userId: string = 'current-user'): Promise<Post> {
  const formData = new FormData();
  const filename = imageUri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  formData.append('image', { uri: imageUri, name: filename, type } as any);
  formData.append('caption', caption);
  formData.append('userId', userId);
  const response = await fetch(`${API_BASE_URL}/api/posts`, { method: 'POST', body: formData, headers: { 'Content-Type': 'multipart/form-data' } });
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to create post'); }
  return response.json();
}

export function getImageUrl(imagePath: string): string { return `${API_BASE_URL}${imagePath}`; }

export async function deletePost(postId: string, userId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-user-id': userId } });
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to delete post'); }
  return response.json();
}

export async function updatePost(postId: string, userId: string, updates: { caption?: string }): Promise<Post> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user-id': userId }, body: JSON.stringify(updates) });
  if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to update post'); }
  return response.json();
}
