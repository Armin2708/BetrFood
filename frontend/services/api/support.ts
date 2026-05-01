import { Platform } from 'react-native';
import { API_BASE_URL, authHeaders } from './client';

export interface SubmitSupportTicketInput {
  subject: string;
  description: string;
  deviceInfo: string;
  osVersion: string;
  appVersion: string;
  screenshotUri?: string | null;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  screenshotPath: string | null;
  deviceInfo: string;
  osVersion: string;
  appVersion: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
}

function inferImageMimeType(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'heif') return 'image/heif';
  return 'image/jpeg';
}

export async function submitSupportTicket(input: SubmitSupportTicketInput): Promise<SupportTicket> {
  const formData = new FormData();
  formData.append('subject', input.subject);
  formData.append('description', input.description);
  formData.append('deviceInfo', input.deviceInfo);
  formData.append('osVersion', input.osVersion);
  formData.append('appVersion', input.appVersion);

  if (input.screenshotUri) {
    const filename = input.screenshotUri.split('/').pop() || 'screenshot.jpg';
    const type = inferImageMimeType(filename);

    if (Platform.OS === 'web') {
      const imageResponse = await fetch(input.screenshotUri);
      const blob = await imageResponse.blob();
      const webBlob = blob.type.startsWith('image/') ? blob : new Blob([blob], { type });
      formData.append('screenshot', webBlob, filename);
    } else {
      formData.append('screenshot', { uri: input.screenshotUri, name: filename, type } as any);
    }
  }

  const response = await fetch(`${API_BASE_URL}/api/support`, {
    method: 'POST',
    body: formData,
    headers: { ...(await authHeaders()) },
  });

  if (!response.ok) {
    const text = await response.text();
    try {
      const error = JSON.parse(text);
      throw new Error(error.error || 'Failed to submit support request');
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error(`Failed to submit support request (HTTP ${response.status})`);
      }
      throw e;
    }
  }

  return response.json();
}
