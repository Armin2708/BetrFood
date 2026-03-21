import { Platform } from 'react-native';

// Match the same base URL pattern used by every other service file
const LOCAL_IP = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:3000`;

export type VisionPantryItem = {
  name: string;
  quantity: number;
  unit: string;
  category: string;
};

async function uriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to convert image to base64'));
        return;
      }
      const commaIndex = result.indexOf(',');
      resolve(result.slice(commaIndex + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function identifyPantryItems(token: string, imageUri: string) {
  const image = await uriToBase64(imageUri);

  const res = await fetch(`${API_BASE_URL}/api/pantry/identify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ image }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Failed to identify pantry items');
  }

  return data as { items: VisionPantryItem[] };
}
