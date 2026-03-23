import React from "react";
import { CollectionsProvider } from "./CollectionsContext";
import { AuthProvider } from "./AuthenticationContext";
import { PantryProvider } from "./PantryContext";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { PreferencesProvider } from "./PreferencesContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ActionSheetProvider>
        <PreferencesProvider>
          <CollectionsProvider>
            <PantryProvider>{children}</PantryProvider>
          </CollectionsProvider>
        </PreferencesProvider>
      </ActionSheetProvider>
    </AuthProvider>
  );
}
