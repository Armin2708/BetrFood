import { API_BASE_URL, authHeaders } from './client';

export interface SuggestedPost {
  id: string;
  caption: string;
  imagePath: string | null;
  username: string;
  mediaType: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  suggestedPosts?: SuggestedPost[];
  conversation_id?: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
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

export interface PostContext {
  postId?: string;
  caption?: string;
  username?: string;
  tags?: string[];
  recipe?: {
    cookTime?: string;
    servings?: number;
    difficulty?: string;
    ingredients?: string[];
    steps?: string[];
  } | null;
}

export async function fetchConversations(): Promise<Conversation[]> {
  const response = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
    headers: await authHeaders(),
  });
  await handleResponse(response);
  const data = await response.json();
  return data.conversations;
}

export async function createConversation(): Promise<Conversation> {
  const response = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
  });
  await handleResponse(response);
  return response.json();
}

export async function deleteConversation(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/chat/conversations/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  await handleResponse(response);
}

export async function renameConversation(id: string, title: string): Promise<Conversation> {
  const response = await fetch(`${API_BASE_URL}/api/chat/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ title }),
  });
  await handleResponse(response);
  return response.json();
}

export async function sendChatMessage(message: string, conversationId?: string, conversationTitle?: string, postContext?: PostContext): Promise<ChatMessage & { conversationId: string }> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ message, conversationId, conversationTitle, postContext: postContext || null }),
  });
  await handleResponse(response);
  return response.json();
}

export async function fetchChatHistory(conversationId?: string): Promise<ChatMessage[]> {
  const params = conversationId ? `?conversationId=${conversationId}` : '';
  const response = await fetch(`${API_BASE_URL}/api/chat/history${params}`, {
    headers: await authHeaders(),
  });
  await handleResponse(response);
  const data = await response.json();
  return data.messages;
}

export async function fetchPantrySuggestions(conversationId?: string): Promise<ChatMessage & { pantryCount: number; conversationId: string }> {
  const params = conversationId ? `?conversationId=${conversationId}` : '';
  const response = await fetch(`${API_BASE_URL}/api/chat/pantry-suggestions${params}`, {
    headers: await authHeaders(),
  });
  await handleResponse(response);
  return response.json();
}
