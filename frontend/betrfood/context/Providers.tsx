import { CollectionsProvider } from "./CollectionsContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CollectionsProvider>
        {children}
    </CollectionsProvider>
  );
}