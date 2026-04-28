/**
 * TextSizeContext
 * Manages the active text size scale for the app.
 * Separate from PreferencesContext to enable live preview before saving.
 *
 * Flow:
 * 1. User opens settings and adjusts text size slider/buttons
 * 2. TextSizeContext updates immediately (live preview)
 * 3. User can see changes in real-time without saving
 * 4. On "Save", the selected size is saved to PreferencesContext (backend)
 * 5. TextSizeContext is updated with the persisted value
 */

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { TEXT_SIZE_MULTIPLIERS, TextSizeScale } from '../utils/textSizeScaling';

interface TextSizeContextType {
  // Current active text size scale
  scale: TextSizeScale;
  // Numeric multiplier value (0.8, 1.0, 1.2, 1.5)
  multiplier: number;
  // Update the text size scale (triggers live preview)
  setScale: (scale: TextSizeScale) => void;
}

const TextSizeContext = createContext<TextSizeContextType | undefined>(undefined);

interface TextSizeProviderProps {
  children: ReactNode;
  // Initial scale from saved preferences (passed from PreferencesContext)
  initialScale?: TextSizeScale;
}

/**
 * Provider component for text size context
 * Should be placed high in the component tree (typically in _layout.tsx)
 */
export function TextSizeProvider({
  children,
  initialScale = 'default',
}: TextSizeProviderProps) {
  const [scale, setScale] = useState<TextSizeScale>(initialScale);

  // Update scale when initialScale changes (e.g., preferences loaded from backend)
  useEffect(() => {
    setScale(initialScale);
  }, [initialScale]);

  const multiplier = TEXT_SIZE_MULTIPLIERS[scale] ?? 1.0;

  return (
    <TextSizeContext.Provider
      value={{
        scale,
        multiplier,
        setScale,
      }}
    >
      {children}
    </TextSizeContext.Provider>
  );
}

/**
 * Hook to use text size context
 * @throws Error if used outside TextSizeProvider
 */
export function useTextSize() {
  const context = useContext(TextSizeContext);
  if (!context) {
    throw new Error('useTextSize must be used within TextSizeProvider');
  }
  return context;
}
