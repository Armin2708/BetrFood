import { API_BASE_URL, authHeaders } from './client';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export async function sendChatMessage(message: string): Promise<ChatMessage> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send message');
  }
  return response.json();
}

export async function fetchChatHistory(): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE_URL}/api/chat/history`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch chat history');
  }
  const data = await response.json();
  return data.messages;
}

export async function fetchPantrySuggestions(): Promise<ChatMessage & { pantryCount: number }> {
  const response = await fetch(`${API_BASE_URL}/api/chat/pantry-suggestions`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get pantry suggestions');
  }
  return response.json();
}
