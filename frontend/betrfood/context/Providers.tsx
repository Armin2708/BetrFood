import { CollectionsProvider } from "./CollectionsContext";
import { ActionSheetProvider } from '@expo/react-native-action-sheet'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ActionSheetProvider>
      <CollectionsProvider>
          {children}
      </CollectionsProvider>
    </ActionSheetProvider>
  );
}