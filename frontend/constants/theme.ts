/**
 * BetrFood Design System
 * Single source of truth for colors, spacing, and typography.
 */

export const colors = {
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

  // Neutrals
  black: '#000',
  white: '#fff',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textQuaternary: '#94A3B8',
  placeholder: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F8FAFC',
  divider: '#e0e0e0',
  backgroundPrimary: '#fff',
  backgroundSecondary: '#f5f5f5',
  backgroundTertiary: '#f0f0f0',
  backgroundSubtle: '#f8f8f8',
  backgroundMuted: '#fafafa',

  // Special
  verified: '#1DA1F2',
  liked: '#22C55E',
  delete: '#e74c3c',

  // Overlay
  overlay: 'rgba(0,0,0,0.4)',
} as const;

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

export const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };
export const minTouchSize = 44; // Apple HIG minimum
