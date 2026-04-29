import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Appearance,
  ColorSchemeName,
  useColorScheme,
} from 'react-native';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DarkTheme, DefaultTheme, Theme as NavigationTheme } from '@react-navigation/native';
import { colors as sharedThemeColors, darkColors, lightColors, ThemeColors } from '../constants/theme';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

type ThemeContextValue = {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  colors: ThemeColors;
  isDark: boolean;
  navigationTheme: NavigationTheme;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
};

const STORAGE_KEY = '@betrfood/theme-preference';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(
  preference: ThemePreference,
  systemScheme: ColorSchemeName
): ResolvedTheme {
  if (preference === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return preference;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const detectedScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    detectedScheme ?? Appearance.getColorScheme()
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value === 'light' || value === 'dark' || value === 'system') {
          setThemePreferenceState(value);
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (detectedScheme) {
      setSystemScheme(detectedScheme);
    }

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });

    return () => subscription.remove();
  }, [detectedScheme]);

  const setThemePreference = async (preference: ThemePreference) => {
    setThemePreferenceState(preference);
    await AsyncStorage.setItem(STORAGE_KEY, preference);
  };

  const resolvedTheme = resolveTheme(themePreference, systemScheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    Object.assign(sharedThemeColors, colors);
  }, [colors]);

  const navigationTheme = useMemo<NavigationTheme>(() => {
    const baseTheme = resolvedTheme === 'dark' ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: colors.primary,
        background: colors.backgroundPrimary,
        card: colors.backgroundElevated,
        text: colors.textPrimary,
        border: colors.border,
        notification: colors.primary,
      },
    };
  }, [colors, resolvedTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themePreference,
      resolvedTheme,
      colors,
      isDark: resolvedTheme === 'dark',
      navigationTheme,
      setThemePreference,
    }),
    [themePreference, resolvedTheme, colors, navigationTheme]
  );

  if (!loaded) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}
