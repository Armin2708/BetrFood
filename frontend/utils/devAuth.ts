export const DEV_BYPASS_AUTH =
  process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true';

export const DEV_BYPASS_USER_ID =
  process.env.EXPO_PUBLIC_DEV_BYPASS_USER_ID || 'dev-user-local';

export const DEV_BYPASS_ROLE =
  process.env.EXPO_PUBLIC_DEV_BYPASS_ROLE || 'user';

export const DEV_BYPASS_EMAIL =
  process.env.EXPO_PUBLIC_DEV_BYPASS_EMAIL || 'dev@betrfood.local';
