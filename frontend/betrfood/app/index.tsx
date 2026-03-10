import { useContext } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { AuthContext } from "../context/AuthenticationContext";

export default function RootIndex() {
  const { user, loading, needsOnboarding } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (user && needsOnboarding) {
    return <Redirect href="/(onboarding)/setup" />;
  }

  if (user) {
    return <Redirect href="/feeds" />;
  }

  return <Redirect href="/(onboarding)" />;
}
