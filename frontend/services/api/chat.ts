import { API_BASE_URL, authHeaders } from './client';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      errorMsg = body.details || body.error || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }
}

export async function sendChatMessage(message: string): Promise<ChatMessage> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ message }),
  });
  await handleResponse(response);
  return response.json();
}

export async function fetchChatHistory(): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE_URL}/api/chat/history`, {
    headers: await authHeaders(),
  });
  await handleResponse(response);
  const data = await response.json();
  return data.messages;
}

export async function fetchPantrySuggestions(): Promise<ChatMessage & { pantryCount: number }> {
  const response = await fetch(`${API_BASE_URL}/api/chat/pantry-suggestions`, {
    headers: await authHeaders(),
  });
  await handleResponse(response);
  return response.json();
}
