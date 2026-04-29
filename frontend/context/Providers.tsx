import React from "react";
import { CollectionsProvider } from "./CollectionsContext";
import { AuthProvider } from "./AuthenticationContext";
import { PantryProvider } from "./PantryContext";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { usePreferences, PreferencesProvider } from "./PreferencesContext";
import { TextSizeProvider as TextSizeProviderComponent } from "./TextSizeContext";
import { FeedLayoutProvider } from "./FeedLayoutContext";
import { ThemeProvider } from "./ThemeContext";

// Wrapper to pass preferences to TextSizeProvider
function TextSizeProviderWithPreferences({ children }: { children: React.ReactNode }) {
  const preferences = usePreferences();
  
  return (
    <TextSizeProviderComponent initialScale={preferences.preferences?.textSizeScale || 'default'}>
      {children}
    </TextSizeProviderComponent>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ActionSheetProvider>
          <PreferencesProvider>
            <TextSizeProviderWithPreferences>
              <FeedLayoutProvider>
                <CollectionsProvider>
                  <PantryProvider>{children}</PantryProvider>
                </CollectionsProvider>
              </FeedLayoutProvider>
            </TextSizeProviderWithPreferences>
          </PreferencesProvider>
        </ActionSheetProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
