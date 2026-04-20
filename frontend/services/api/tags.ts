import { API_BASE_URL, authHeaders } from './client';
import { Post } from './posts';

export interface Tag {
  id: number;
  name: string;
  type: 'cuisine' | 'meal' | 'dietary';
}

export interface TrendingTag extends Tag {
  postCount: number;
}

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

export async function fetchTrendingHashtags(limit = 20): Promise<TrendingTag[]> {
  const response = await fetch(`${API_BASE_URL}/api/tags/trending?limit=${limit}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch trending hashtags');
  }
  return response.json();
}

export interface HashtagPostsResponse {
  tag: Tag;
  totalCount: number;
  posts: Post[];
  hasMore: boolean;
}

export async function fetchPostsByHashtag(
  tagId: number,
  sort: 'recent' | 'popular' = 'recent',
  limit = 20,
  offset = 0
): Promise<HashtagPostsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/tags/${tagId}/posts?sort=${sort}&limit=${limit}&offset=${offset}`,
    { headers: await authHeaders() }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch hashtag posts');
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
