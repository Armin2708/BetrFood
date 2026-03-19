import { useContext } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { AuthContext } from "../context/AuthenticationContext";

export default function RootIndex() {
  const { isSignedIn, isLoaded } = useAuth();
  const { loading, needsOnboarding } = useContext(AuthContext);

  if (!isLoaded || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  if (isSignedIn && needsOnboarding) {
    return <Redirect href="/(onboarding)/setup" />;
  }

  if (isSignedIn) {
    return <Redirect href="/feeds" />;
  }

  return <Redirect href="/(auth)/login" />;
}
