import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { DEV_BYPASS_AUTH, DEV_BYPASS_ROLE, DEV_BYPASS_USER_ID } from '../../utils/devAuth';

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    return `http://${host}:3000`;
  }
  const fallbackIp = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${fallbackIp}:3000`;
}

export const API_BASE_URL = getApiBaseUrl();

// Token storage - set by AuthContext
let _authToken: string | null = null;
let _getTokenFn: (() => Promise<string | null>) | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

export function setTokenGetter(fn: (() => Promise<string | null>) | null) {
  _getTokenFn = fn;
}

async function getFreshToken(): Promise<string | null> {
  if (_getTokenFn) {
    try {
      const token = await _getTokenFn();
      if (token) {
        _authToken = token;
        return token;
      }
      _authToken = null;
      return null;
    } catch {
      _authToken = null;
      return null;
    }
  }
  return _authToken;
}

export async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (DEV_BYPASS_AUTH) {
    headers['x-dev-bypass-user-id'] = DEV_BYPASS_USER_ID;
    headers['x-dev-bypass-role'] = DEV_BYPASS_ROLE;
    return headers;
  }
  const token = await getFreshToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function getImageUrl(imagePath: string): string {
  return `${API_BASE_URL}${imagePath}`;
}

export function getAvatarUrl(avatarUrl: string | null | undefined, fallbackName?: string): string {
  if (!avatarUrl) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName || 'U')}&background=random`;
  }
  if (avatarUrl.startsWith('/uploads/')) {
    return getImageUrl(avatarUrl);
  }
  if (avatarUrl.startsWith('http')) {
    return avatarUrl;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName || 'U')}&background=random`;
}
