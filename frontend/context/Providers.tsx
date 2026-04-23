import React from "react";
import { CollectionsProvider } from "./CollectionsContext";
import { AuthProvider } from "./AuthenticationContext";
import { PantryProvider } from "./PantryContext";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { PreferencesProvider } from "./PreferencesContext";
import { FeedLayoutProvider } from "./FeedLayoutContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ActionSheetProvider>
        <PreferencesProvider>
          <FeedLayoutProvider>
            <CollectionsProvider>
              <PantryProvider>{children}</PantryProvider>
            </CollectionsProvider>
          </FeedLayoutProvider>
        </PreferencesProvider>
      </ActionSheetProvider>
    </AuthProvider>
  );
}
