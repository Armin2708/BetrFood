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
  status?: 'sending' | 'sent' | 'error';
  suggestedPosts?: SuggestedPost[];
  conversation_id?: string;
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  type: 'image';
  uri: string;
  mimeType?: string;
  dataUrl?: string;
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

export async function sendChatMessage(
  message: string,
  conversationId?: string,
  conversationTitle?: string,
  postContext?: PostContext,
  attachments?: ChatAttachment[]
): Promise<ChatMessage & { conversationId: string }> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({
      message,
      conversationId,
      conversationTitle,
      postContext: postContext || null,
      attachments: attachments || [],
    }),
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

/**
 * Streams an AI response token-by-token via SSE.
 * Returns a cancel function — call it to abort mid-stream.
 */
export function streamChatMessage(
  message: string,
  onToken: (token: string) => void,
  onDone: (savedMessage?: ChatMessage, conversationId?: string) => void,
  onError: (err: string) => void,
  conversationId?: string,
  conversationTitle?: string,
  postContext?: PostContext,
  attachments?: ChatAttachment[]
): () => void {
  let xhr: XMLHttpRequest | null = null;
  let cancelled = false;

  authHeaders().then((headers) => {
    if (cancelled) return;

    xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/api/chat/stream`);

    Object.entries({ 'Content-Type': 'application/json', ...headers }).forEach(([k, v]) => {
      xhr!.setRequestHeader(k, v as string);
    });

    let processed = 0;
    let doneFired = false;

    const parseChunk = (chunk: string) => {
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (!payload) continue;
        try {
          const json = JSON.parse(payload);
          if (json.token) onToken(json.token);
          if (json.done && !doneFired) {
            doneFired = true;
            onDone(json.message, json.conversationId);
          }
          if (json.error && !doneFired) {
            doneFired = true;
            onError(json.error);
          }
        } catch {}
      }
    };

    xhr.onprogress = () => {
      if (cancelled) return;
      const raw = xhr!.responseText.slice(processed);
      processed = xhr!.responseText.length;
      parseChunk(raw);
    };

    xhr.onload = () => {
      if (cancelled || doneFired) return;
      doneFired = true;
      // Handle non-SSE error responses (e.g. 401, 500)
      if (xhr!.status >= 400) {
        try {
          const body = JSON.parse(xhr!.responseText);
          onError(body.details || body.error || `HTTP ${xhr!.status}`);
        } catch {
          onError(`HTTP ${xhr!.status}`);
        }
        return;
      }
      // Parse any remaining chunk not caught by onprogress
      const remaining = xhr!.responseText.slice(processed);
      if (remaining) parseChunk(remaining);
      if (!doneFired) onDone();
    };

    xhr.onerror = () => {
      if (!cancelled) onError('Stream connection failed. Please try again.');
    };

    xhr.send(JSON.stringify({
      message,
      conversationId: conversationId || undefined,
      conversationTitle: conversationTitle || undefined,
      postContext: postContext || null,
      attachments: attachments || [],
    }));
  });

  return () => {
    cancelled = true;
    xhr?.abort();
  };
}
