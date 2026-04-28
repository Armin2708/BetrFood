import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface DeviceInfo {
  osName: string;
  osVersion: string;
  appVersion: string;
  buildNumber?: string;
  deviceModel?: string;
  manufacturer?: string;
}

/**
 * Collects device and app information for bug reports
 * Returns structured data that will be stored as JSONB in the database
 */
export function getDeviceInfo(): DeviceInfo {
  const expoConfig = Constants.expoConfig;
  const manifest2 = Constants.manifest2;

  // Get app version from Expo config
  let appVersion = '1.0.0';
  if (expoConfig?.version) {
    appVersion = expoConfig.version;
  } else if (manifest2?.version) {
    appVersion = manifest2.version;
  }

  // Get build number if available
  let buildNumber: string | undefined;
  if (expoConfig?.ios?.buildNumber) {
    buildNumber = expoConfig.ios.buildNumber;
  } else if (expoConfig?.android?.versionCode) {
    buildNumber = expoConfig.android.versionCode.toString();
  }

  // Get device model and manufacturer (Android specific)
  let deviceModel: string | undefined;
  let manufacturer: string | undefined;
  if (Platform.OS === 'android') {
    try {
      // These would typically require react-native-device-info
      // For now, we're capturing what's available via React Native Platform module
      deviceModel = Platform.constants?.Model;
      manufacturer = Platform.constants?.Manufacturer;
    } catch (e) {
      // Fail silently if not available
    }
  }

  // Get OS version
  const osVersion = Platform.Version?.toString() || 'unknown';

  return {
    osName: Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web',
    osVersion,
    appVersion,
    buildNumber,
    deviceModel,
    manufacturer,
  };
}

/**
 * Returns device info as a formatted string for user display
 */
export function formatDeviceInfo(deviceInfo: DeviceInfo): string {
  const parts = [
    `${deviceInfo.osName} ${deviceInfo.osVersion}`,
    `App v${deviceInfo.appVersion}`,
  ];

  if (deviceInfo.buildNumber) {
    parts.push(`Build ${deviceInfo.buildNumber}`);
  }

  if (deviceInfo.deviceModel) {
    parts.push(`${deviceInfo.manufacturer || ''} ${deviceInfo.deviceModel}`.trim());
  }

  return parts.join(' | ');
}
