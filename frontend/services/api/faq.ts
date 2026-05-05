import { API_BASE_URL } from './client';

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type FaqCategory = {
  id: string;
  title: string;
  icon: string;
  items: FaqItem[];
};

export async function fetchFaq(): Promise<FaqCategory[]> {
  const response = await fetch(`${API_BASE_URL}/api/faq`);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || 'Failed to load FAQ');
  }
  const data = await response.json();
  if (!Array.isArray(data?.categories)) return [];
  return data.categories;
}

export async function recordFaqView(itemId: string): Promise<void> {
  if (!itemId) return;
  await fetch(`${API_BASE_URL}/api/faq/items/${encodeURIComponent(itemId)}/view`, {
    method: 'POST',
  });
}
