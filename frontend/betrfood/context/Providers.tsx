import { CollectionsProvider } from "./CollectionsContext";
import { AuthProvider } from "./AuthenticationContext";
import { ActionSheetProvider } from '@expo/react-native-action-sheet'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ActionSheetProvider>
        <CollectionsProvider>
            {children}
        </CollectionsProvider>
      </ActionSheetProvider>
    </AuthProvider>
  );
}