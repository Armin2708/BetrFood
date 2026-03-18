import { API_BASE_URL, authHeaders } from './client';

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
