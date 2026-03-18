import { API_BASE_URL, authHeaders } from './client';

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
