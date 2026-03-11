import { Platform } from 'react-native';

const LOCAL_IP = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:3000`;

// Token storage - set by AuthContext
let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (_authToken) {
    headers['Authorization'] = `Bearer ${_authToken}`;
  }
  return headers;
}

// Auth API functions (routed through backend to avoid Clerk CAPTCHA)

export interface AuthResponse {
  token: string;
  sessionId: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }
  return data;
}

export async function apiSignup(email: string, password: string, firstName?: string, lastName?: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, firstName, lastName }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Signup failed');
  }
  return data;
}

export async function apiRefreshToken(sessionId: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Token refresh failed');
  }
  return data.token;
}

export async function apiLogout(sessionId: string): Promise<void> {
  await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  }).catch(() => {});
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
    headers: authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch posts');
  }
  return response.json();
}

export async function fetchPost(postId: string): Promise<Post> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
    headers: authHeaders(),
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
      'Content-Type': 'multipart/form-data',
      ...authHeaders(),
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
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
    headers: authHeaders(),
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
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
    headers: authHeaders(),
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
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
    headers: authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove tag');
  }
  return response.json();
}

export async function fetchPostTags(postId: string): Promise<Tag[]> {
  const response = await fetch(`${API_BASE_URL}/api/tags/posts/${postId}/tags`, {
    headers: authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch post tags');
  }
  return response.json();
}

export async function fetchPostsByTags(tagIds: number[]): Promise<Post[]> {
  const response = await fetch(`${API_BASE_URL}/api/tags/posts/by-tags?tags=${tagIds.join(',')}`, {
    headers: authHeaders(),
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
}

export async function fetchMyProfile(): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/profiles/me`, {
    headers: authHeaders(),
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
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to complete onboarding');
  }
  return response.json();
}

export async function checkUsername(username: string): Promise<{ available: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/profiles/check-username/${encodeURIComponent(username)}`, {
    headers: authHeaders(),
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
    headers: authHeaders(),
  });
  if (!response.ok) return { role: 'user' };
  return response.json();
}

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/api/profiles/${encodeURIComponent(userId)}`, {
    headers: authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch user profile');
  }
  return response.json();
}
