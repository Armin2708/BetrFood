import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

export type FeedLayout = "grid" | "list";

const STORAGE_KEY = "@betrfood/feedLayout";
const DEFAULT_LAYOUT: FeedLayout = "grid";

interface FeedLayoutContextType {
  layout: FeedLayout;
  setLayout: (value: FeedLayout) => Promise<void>;
  ready: boolean;
}

const FeedLayoutContext = createContext<FeedLayoutContextType | undefined>(undefined);

export function FeedLayoutProvider({ children }: { children: ReactNode }) {
  const [layout, setLayoutState] = useState<FeedLayout>(DEFAULT_LAYOUT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "grid" || stored === "list") {
          setLayoutState(stored);
        }
      } catch {
        // Fall back to default.
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setLayout = useCallback(async (value: FeedLayout) => {
    setLayoutState(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Ignore persistence failure; in-memory state is already updated.
    }
  }, []);

  return (
    <FeedLayoutContext.Provider value={{ layout, setLayout, ready }}>
      {children}
    </FeedLayoutContext.Provider>
  );
}

export function useFeedLayout() {
  const ctx = useContext(FeedLayoutContext);
  if (!ctx) {
    throw new Error("useFeedLayout must be used within FeedLayoutProvider");
  }
  return ctx;
}
