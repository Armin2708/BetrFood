import { API_BASE_URL, authHeaders } from './client';

export interface PantryItem {
  id: string;
  userId: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expirationDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PantryItemInput {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expirationDate?: string | null;
}

export async function fetchPantryItems(): Promise<PantryItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/pantry`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch pantry items');
  }
  return response.json();
}

export async function createPantryItem(item: PantryItemInput): Promise<PantryItem> {
  const response = await fetch(`${API_BASE_URL}/api/pantry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(item),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create pantry item');
  }
  return response.json();
}

export async function updatePantryItem(
  id: string,
  updates: Partial<PantryItemInput>
): Promise<PantryItem> {
  const response = await fetch(`${API_BASE_URL}/api/pantry/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update pantry item');
  }
  return response.json();
}

export async function deletePantryItem(id: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/pantry/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete pantry item');
  }
  return response.json();
}
