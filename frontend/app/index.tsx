import { useContext } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { AuthContext } from "../context/AuthenticationContext";
import { DEV_BYPASS_AUTH } from "../utils/devAuth";

export default function RootIndex() {
  const { isSignedIn, isLoaded } = useAuth();
  const { loading, needsOnboarding } = useContext(AuthContext);
  const signedIn = DEV_BYPASS_AUTH || isSignedIn;
  const authReady = DEV_BYPASS_AUTH || isLoaded;

  if (!authReady || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  if (signedIn && needsOnboarding) {
    return <Redirect href="/(onboarding)/setup" />;
  }

  if (signedIn) {
    return <Redirect href="/feeds" />;
  }

  return <Redirect href="/(auth)/login" />;
}
