/**
 * BetrFood Design System
 * Single source of truth for colors, spacing, and typography.
 */

export const colors = {
  // Brand
  primary: '#FF6B35',
  primaryLight: '#FF8F66',
  primaryDark: '#E55A25',

  // Semantic
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  // Tag types
  tagCuisine: '#FF6B35',
  tagMeal: '#4CAF50',
  tagDietary: '#2196F3',

  // Recipe
  recipeBackground: '#FFF8F0',
  recipeBorder: '#FFE0C2',

  // Neutrals
  black: '#000',
  white: '#fff',
  textPrimary: '#333',
  textSecondary: '#666',
  textTertiary: '#888',
  textQuaternary: '#999',
  placeholder: '#999',
  border: '#ddd',
  borderLight: '#eee',
  divider: '#e0e0e0',
  backgroundPrimary: '#fff',
  backgroundSecondary: '#f5f5f5',
  backgroundTertiary: '#f0f0f0',
  backgroundSubtle: '#f8f8f8',
  backgroundMuted: '#fafafa',

  // Special
  verified: '#1DA1F2',
  liked: '#FF3B30',
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

export const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };
export const minTouchSize = 44; // Apple HIG minimum
