import { API_BASE_URL, authHeaders } from './client';
import { DeviceInfo, getDeviceInfo } from '../../utils/deviceInfo';

export interface BugReportSubmission {
  description: string;
  screenshot?: {
    uri: string;
    name: string;
    type: string;
  };
  deviceInfo?: DeviceInfo;
  appVersion?: string;
}

export interface BugReportResponse {
  id: string;
  message: string;
  reference: string;
  description: string;
  screenshotUrl: string | null;
  appVersion: string | null;
  createdAt: string;
}

export interface BugReport {
  id: string;
  description: string;
  status: string;
  hasScreenshot: boolean;
  screenshotUrl: string | null;
  appVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Submit a bug report with optional screenshot
 * @param description - The bug description (required)
 * @param screenshot - Optional image file object with uri, name, and type
 * @returns Promise with bug report response including reference ID
 */
export async function reportBug(
  description: string,
  screenshot?: { uri: string; name: string; type: string }
): Promise<BugReportResponse> {
  try {
    // Get device info
    const deviceInfo = getDeviceInfo();

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('description', description);
    formData.append('deviceInfo', JSON.stringify(deviceInfo));
    formData.append('appVersion', deviceInfo.appVersion);

    // Add screenshot if provided
    if (screenshot) {
      // Convert URI to Blob for FormData
      const response = await fetch(screenshot.uri);
      const blob = await response.blob();
      formData.append('screenshot', blob, screenshot.name);
    }

    // Make API request
    const apiResponse = await fetch(`${API_BASE_URL}/api/bug-reports`, {
      method: 'POST',
      headers: await authHeaders(),
      body: formData,
    });

    if (!apiResponse.ok) {
      const error = await apiResponse.json();
      throw new Error(error.error || 'Failed to submit bug report');
    }

    return apiResponse.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit bug report';
    throw new Error(message);
  }
}

/**
 * Fetch user's bug reports (paginated)
 * @param limit - Number of reports per page (default: 20, max: 100)
 * @param offset - Pagination offset (default: 0)
 * @returns Promise with bug reports list and pagination info
 */
export async function getBugReports(limit = 20, offset = 0) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/bug-reports?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: await authHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch bug reports');
    }

    return response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch bug reports';
    throw new Error(message);
  }
}

/**
 * Fetch a specific bug report by ID
 * @param id - The bug report ID
 * @returns Promise with bug report details
 */
export async function getBugReport(id: string): Promise<BugReport> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bug-reports/${id}`, {
      method: 'GET',
      headers: await authHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch bug report');
    }

    return response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch bug report';
    throw new Error(message);
  }
}
