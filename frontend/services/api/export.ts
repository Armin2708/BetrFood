import { API_BASE_URL, authHeaders } from './client';

export interface ExportResult {
  filename: string;
  json: string;
}

/**
 * Request a synchronous export of the current user's personal data as a JSON file.
 * The server returns a `Content-Disposition: attachment` JSON payload; this helper
 * reads it as text so the caller can persist or share it on the device.
 */
export async function exportMyData(): Promise<ExportResult> {
  const response = await fetch(`${API_BASE_URL}/api/users/me/export`, {
    headers: await authHeaders(),
  });

  if (!response.ok) {
    let message = `Failed to export data (HTTP ${response.status})`;
    try {
      const body = await response.json();
      if (body && typeof body.error === 'string') message = body.error;
    } catch {
      // server may have returned plain text / HTML on failure
    }
    throw new Error(message);
  }

  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match ? match[1] : `betrfood-export-${new Date().toISOString().slice(0, 10)}.json`;

  const json = await response.text();
  return { filename, json };
}
