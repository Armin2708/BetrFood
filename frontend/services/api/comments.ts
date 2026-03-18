import { API_BASE_URL, authHeaders } from './client';

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
