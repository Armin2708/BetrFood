import { Platform } from 'react-native';
import { API_BASE_URL, authHeaders } from './client';
import { Recipe, RecipeInput } from './recipes';
import { Tag } from './tags';

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
  likeCount?: number;
  liked?: boolean;
  commentCount?: number;
  images?: string[];
  mediaType?: 'image' | 'video';
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

const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|avi|m4v)$/i;

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const videoTypes: Record<string, string> = {
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
    avi: 'video/x-msvideo', m4v: 'video/x-m4v',
  };
  const imageTypes: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp',
    heif: 'image/heif', heic: 'image/heic',
  };
  if (ext && videoTypes[ext]) return videoTypes[ext];
  if (ext && imageTypes[ext]) return imageTypes[ext];
  return 'image/jpeg';
}

export async function createPostApi(
  mediaUris: string | string[],
  caption: string,
  recipe?: RecipeInput | null
): Promise<Post> {
  const uris = Array.isArray(mediaUris) ? mediaUris : [mediaUris];
  const formData = new FormData();

  for (const uri of uris) {
    const filename = uri.split('/').pop() || 'photo.jpg';
    const type = getMimeType(filename);

    if (Platform.OS === 'web') {
      const resp = await fetch(uri);
      const blob = await resp.blob();
      const mimeExtMap: Record<string, string> = {
        'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
        'image/webp': '.webp', 'image/heif': '.heif', 'image/heic': '.heic',
        'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/webm': '.webm',
      };
      const blobType = blob.type || type;
      const ext = mimeExtMap[blobType] || '.jpg';
      const hasValidExt = /\.(jpe?g|png|gif|webp|heif|heic|mp4|mov|webm)$/i.test(filename);
      const webFilename = hasValidExt ? filename : `upload${ext}`;
      const webBlob = blobType.startsWith('image/') || blobType.startsWith('video/')
        ? blob
        : new Blob([blob], { type });
      formData.append('images', webBlob, webFilename);
    } else {
      formData.append('images', {
        uri,
        name: filename,
        type,
      } as any);
    }
  }

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
    const text = await response.text();
    try {
      const error = JSON.parse(text);
      throw new Error(error.error || 'Failed to create post');
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error(`Failed to create post (HTTP ${response.status})`);
      }
      throw e;
    }
  }

  return response.json();
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
