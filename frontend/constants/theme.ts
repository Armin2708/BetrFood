/**
 * BetrFood Design System
 * Single source of truth for colors, spacing, and typography.
 */

const sharedColors = {
  // Brand
  primary: '#22C55E',
  primaryLight: '#4ADE80',
  primaryDark: '#16A34A',
  primaryGradientStart: '#22C55E',
  primaryGradientEnd: '#10B981',

  // Semantic
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  // Tag types
  tagCuisine: '#22C55E',
  tagMeal: '#4CAF50',
  tagDietary: '#2196F3',

  // Recipe
  recipeBackground: '#F0FDF4',
  recipeBorder: '#BBF7D0',

  // Special
  verified: '#1DA1F2',
  liked: '#22C55E',
  delete: '#e74c3c',
} as const;

export const lightColors = {
  ...sharedColors,
  black: '#000',
  white: '#fff',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textQuaternary: '#94A3B8',
  placeholder: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#E2E8F0',
  backgroundPrimary: '#fff',
  backgroundSecondary: '#F8FAFC',
  backgroundTertiary: '#F1F5F9',
  backgroundSubtle: '#FCFCFD',
  backgroundMuted: '#FAFAFA',
  backgroundElevated: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.4)',
  headerBackground: '#F8FAFC',
  tabBarBackground: '#16A34A',
  tabBarActive: '#FFFFFF',
  tabBarInactive: 'rgba(255,255,255,0.55)',
  tabBarBadgeBackground: '#FFFFFF',
  tabBarBadgeText: '#16A34A',
  fabBackground: '#FFFFFF',
  fabIcon: '#16A34A',
  cardShadow: 'rgba(15, 23, 42, 0.08)',
} as const;

export const darkColors = {
  ...sharedColors,
  black: '#000000',
  white: '#FFFFFF',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',
  textQuaternary: '#64748B',
  placeholder: '#64748B',
  border: '#334155',
  borderLight: '#1E293B',
  divider: '#334155',
  backgroundPrimary: '#020617',
  backgroundSecondary: '#0F172A',
  backgroundTertiary: '#111827',
  backgroundSubtle: '#17212F',
  backgroundMuted: '#111827',
  backgroundElevated: '#1E293B',
  overlay: 'rgba(0,0,0,0.6)',
  headerBackground: '#020617',
  tabBarBackground: '#14532D',
  tabBarActive: '#F8FAFC',
  tabBarInactive: 'rgba(248,250,252,0.6)',
  tabBarBadgeBackground: '#F8FAFC',
  tabBarBadgeText: '#14532D',
  fabBackground: '#F8FAFC',
  fabIcon: '#14532D',
  cardShadow: 'rgba(0, 0, 0, 0.45)',
} as const;

export type ThemeColors = typeof lightColors;

export const colors: ThemeColors = { ...lightColors };

export const TAG_TYPE_COLORS: Record<string, string> = {
  cuisine: colors.tagCuisine,
  meal: colors.tagMeal,
  dietary: colors.tagDietary,
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: colors.success,
  medium: colors.warning,
  hard: colors.error,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  full: 999,
} as const;

export const shadows = {
  sm: '0 1px 3px rgba(0,0,0,0.08)',
  md: '0 2px 8px rgba(0,0,0,0.06)',
  lg: '0 4px 12px rgba(0,0,0,0.15)',
} as const;

export const overlays = {
  light: 'rgba(0,0,0,0.35)',
  medium: 'rgba(0,0,0,0.5)',
} as const;

export const typography = {
  title: { fontSize: 20, fontWeight: '700' as const },
  subtitle: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 14, fontWeight: '600' as const },
} as const;

/**
 * Helper function to scale typography based on user preference
 * Pass the multiplier from useTextSize() hook to this function
 */
export function getScaledTypography(multiplier: number) {
  return {
    title: { ...typography.title, fontSize: Math.round(typography.title.fontSize * multiplier) },
    subtitle: { ...typography.subtitle, fontSize: Math.round(typography.subtitle.fontSize * multiplier) },
    body: { ...typography.body, fontSize: Math.round(typography.body.fontSize * multiplier) },
    caption: { ...typography.caption, fontSize: Math.round(typography.caption.fontSize * multiplier) },
    small: { ...typography.small, fontSize: Math.round(typography.small.fontSize * multiplier) },
    label: { ...typography.label, fontSize: Math.round(typography.label.fontSize * multiplier) },
  };
}

export const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };
export const minTouchSize = 44; // Apple HIG minimum
