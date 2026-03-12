import React, { useContext, useEffect } from "react";
import { CollectionsProvider } from "./CollectionsContext";
import { AuthProvider, AuthContext } from "./AuthenticationContext";
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import { setAuthToken } from "../services/api";

function AuthTokenSync({ children }: { children: React.ReactNode }) {
  const { token } = useContext(AuthContext);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthTokenSync>
        <ActionSheetProvider>
          <CollectionsProvider>{children}</CollectionsProvider>
        </ActionSheetProvider>
      </AuthTokenSync>
    </AuthProvider>
  );
}
