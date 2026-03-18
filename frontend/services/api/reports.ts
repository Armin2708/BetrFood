import { API_BASE_URL, authHeaders } from './client';

export async function reportContent(targetType: string, targetId: string, reason: string) {
  const response = await fetch(`${API_BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ targetType, targetId, reason }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to report content');
  }
  return response.json();
}
