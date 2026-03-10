import { useContext } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { AuthContext } from "../context/AuthenticationContext";

export default function RootIndex() {
  const { user, loading } = useContext(AuthContext);

  // Wait for session restore before routing — prevents flash of wrong screen
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/feeds" />;
  }

  return <Redirect href="/(onboarding)" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
