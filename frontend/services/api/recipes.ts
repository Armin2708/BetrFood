import { API_BASE_URL, authHeaders } from './client';

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

export async function fetchRecipe(postId: string): Promise<Recipe | null> {
  const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/recipe`, {
    headers: await authHeaders(),
  });
  if (response.status === 404) {
    return null;
  }
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
