import { Image } from 'expo-image';
import { Paths } from 'expo-file-system';

export function getMediaCacheSizeBytes(): number {
  try {
    const dir = Paths.cache;
    if (!dir.exists) return 0;
    return dir.size ?? 0;
  } catch {
    return 0;
  }
}

export async function clearMediaCache(): Promise<void> {
  try {
    await Image.clearDiskCache();
  } catch {}
  try {
    await Image.clearMemoryCache();
  } catch {}
  try {
    const dir = Paths.cache;
    if (dir.exists) {
      for (const entry of dir.list()) {
        try {
          entry.delete();
        } catch {}
      }
    }
  } catch {}
}

export function formatCacheSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  if (i === 0) return `${Math.round(value)} ${units[i]}`;
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[i]}`;
}
