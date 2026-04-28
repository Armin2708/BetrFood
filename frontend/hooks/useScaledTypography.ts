/**
 * useScaledTypography Hook
 * Provides scaled typography values based on user's text size preference
 * Use this hook instead of importing `typography` directly from theme
 *
 * Example:
 *   const scaledTypography = useScaledTypography();
 *   <Text style={scaledTypography.body}>Hello</Text>
 */

import { useMemo } from 'react';
import { typography, getScaledTypography } from '../constants/theme';
import { useTextSize } from '../context/TextSizeContext';

export function useScaledTypography() {
  const { multiplier } = useTextSize();
  
  // Memoize to avoid recalculations on every render
  return useMemo(() => getScaledTypography(multiplier), [multiplier]);
}

/**
 * Alternative hook to get just the multiplier for custom scaling
 */
export function useTextSizeMultiplier() {
  const { multiplier } = useTextSize();
  return multiplier;
}

/**
 * Helper to scale individual font sizes
 */
export function useScaleFontSize(baseSize: number): number {
  const { multiplier } = useTextSize();
  return Math.round(baseSize * multiplier);
}
