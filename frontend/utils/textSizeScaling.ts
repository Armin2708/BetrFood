/**
 * Text Size Scaling Utilities
 * Provides functions to scale font sizes based on user preference multiplier.
 * Ensures consistent scaling across the app while maintaining proportions.
 */

export type TextSizeScale = 'small' | 'default' | 'large' | 'xLarge';

/**
 * Maps text size labels to numeric multipliers
 */
export const TEXT_SIZE_MULTIPLIERS: Record<TextSizeScale, number> = {
  small: 0.8,
  default: 1.0,
  large: 1.2,
  xLarge: 1.5,
} as const;

/**
 * Gets the multiplier value for a given text size scale
 */
export function getTextSizeMultiplier(scale: TextSizeScale | number): number {
  if (typeof scale === 'number') {
    return scale;
  }
  return TEXT_SIZE_MULTIPLIERS[scale] ?? 1.0;
}

/**
 * Scales a base font size by the given multiplier
 * @param baseFontSize The base font size in pixels
 * @param multiplier The scale multiplier (e.g., 0.8, 1.0, 1.2, 1.5)
 * @returns The scaled font size, rounded to nearest integer
 */
export function scaleFontSize(baseFontSize: number, multiplier: number): number {
  return Math.round(baseFontSize * multiplier);
}

/**
 * Gets display name for a text size scale
 */
export function getTextSizeName(scale: TextSizeScale): string {
  const names: Record<TextSizeScale, string> = {
    small: 'Small',
    default: 'Default',
    large: 'Large',
    xLarge: 'Extra Large',
  };
  return names[scale] ?? 'Default';
}

/**
 * Gets a description of what a text size scale does
 */
export function getTextSizeDescription(scale: TextSizeScale): string {
  const descriptions: Record<TextSizeScale, string> = {
    small: 'Compact text, more content visible',
    default: 'Standard text size',
    large: 'Enlarged text, easier to read',
    xLarge: 'Very large text for accessibility',
  };
  return descriptions[scale] ?? '';
}

/**
 * Creates a helper object for applying text size scaling to a typography preset
 * @param baseTypography Object with fontSize property
 * @param multiplier Scale multiplier
 * @returns New object with scaled fontSize
 */
export function applyTextSizeScale<T extends { fontSize: number }>(
  baseTypography: T,
  multiplier: number
): T {
  return {
    ...baseTypography,
    fontSize: scaleFontSize(baseTypography.fontSize, multiplier),
  };
}

/**
 * Creates a helper to apply scaling to multiple typography presets at once
 * @param typographyObject Object with typography definitions
 * @param multiplier Scale multiplier
 * @returns New object with all fontSize values scaled
 */
export function applyTextSizeScaleToAll<T extends Record<string, any>>(
  typographyObject: T,
  multiplier: number
): T {
  const scaled: any = {};
  for (const [key, value] of Object.entries(typographyObject)) {
    if (value && typeof value === 'object' && 'fontSize' in value) {
      scaled[key] = applyTextSizeScale(value, multiplier);
    } else {
      scaled[key] = value;
    }
  }
  return scaled;
}
