import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const SUPPORT_ESTIMATED_RESPONSE = 'within 24 hours';

export interface SupportMetadata {
  deviceInfo: string;
  osVersion: string;
  appVersion: string;
}

type MetadataSource = {
  platformOS?: string;
  platformVersion?: string | number;
  deviceName?: string | null;
  appVersion?: string | null;
};

export function buildSupportMetadata(source?: MetadataSource): SupportMetadata {
  const platformOS = source?.platformOS || Platform.OS;
  const platformVersion = source?.platformVersion ?? Platform.Version;
  const deviceName = source?.deviceName ?? Constants.deviceName ?? null;
  const appVersion = source?.appVersion ?? Constants.expoConfig?.version ?? 'unknown';
  const osVersion = String(platformVersion ?? 'unknown');
  const deviceInfo = deviceName
    ? `${deviceName} (${platformOS})`
    : `${platformOS} device`;

  return {
    deviceInfo,
    osVersion,
    appVersion,
  };
}

export function validateSupportForm(subject: string, description: string): string | null {
  if (!subject.trim()) return 'Subject is required.';
  if (!description.trim()) return 'Description is required.';
  return null;
}
