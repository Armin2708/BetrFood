import React from "react";
import { CollectionsProvider } from "./CollectionsContext";
import { AuthProvider } from "./AuthenticationContext";
import { PantryProvider } from "./PantryContext";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { PreferencesProvider } from "./PreferencesContext";
import { ThemeProvider } from "./ThemeContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ActionSheetProvider>
          <PreferencesProvider>
            <CollectionsProvider>
              <PantryProvider>{children}</PantryProvider>
            </CollectionsProvider>
          </PreferencesProvider>
        </ActionSheetProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
