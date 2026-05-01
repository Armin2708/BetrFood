import React from "react";
import { CollectionsProvider } from "./CollectionsContext";
import { AuthProvider } from "./AuthenticationContext";
import { PantryProvider } from "./PantryContext";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { usePreferences, PreferencesProvider } from "./PreferencesContext";
import { FeedLayoutProvider } from "./FeedLayoutContext";
import { ThemeProvider } from "./ThemeContext";

// Wrapper to pass preferences to ThemeProvider
function ThemeProviderWithPreferences({ children }: { children: React.ReactNode }) {
  const preferences = usePreferences();
  
  return (
    <ThemeProvider initialTextSizeScale={preferences.preferences?.textSizeScale || 'default'}>
      {children}
    </ThemeProvider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ActionSheetProvider>
        <PreferencesProvider>
          <ThemeProviderWithPreferences>
            <FeedLayoutProvider>
              <CollectionsProvider>
                <PantryProvider>{children}</PantryProvider>
              </CollectionsProvider>
            </FeedLayoutProvider>
          </ThemeProviderWithPreferences>
        </PreferencesProvider>
      </ActionSheetProvider>
    </AuthProvider>
  );
}
