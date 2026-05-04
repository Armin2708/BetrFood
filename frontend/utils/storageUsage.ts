import { Directory, Paths } from 'expo-file-system';
import { getMediaCacheSizeBytes } from './mediaCache';

export type StorageBreakdown = {
  cacheBytes: number;
  downloadsBytes: number;
  appDataBytes: number;
  totalBytes: number;
};

function safeDirectorySize(dir: Directory): number {
  try {
    if (!dir.exists) return 0;
    return dir.size ?? 0;
  } catch {
    return 0;
  }
}

export function getStorageBreakdown(): StorageBreakdown {
  const cacheBytes = getMediaCacheSizeBytes();

  let downloadsBytes = 0;
  try {
    const downloads = new Directory(Paths.document, 'downloads');
    downloadsBytes = safeDirectorySize(downloads);
  } catch {}

  let documentBytes = 0;
  try {
    documentBytes = safeDirectorySize(Paths.document);
  } catch {}

  const appDataBytes = Math.max(0, documentBytes - downloadsBytes);

  return {
    cacheBytes,
    downloadsBytes,
    appDataBytes,
    totalBytes: cacheBytes + downloadsBytes + appDataBytes,
  };
}
