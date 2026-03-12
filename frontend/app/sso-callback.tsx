import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useClerk } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

export default function SSOCallback() {
  const clerk = useClerk();
  const router = useRouter();

  useEffect(() => {
    if (!clerk.loaded) return;

    clerk.handleRedirectCallback({
      signInFallbackRedirectUrl: "/",
      signUpFallbackRedirectUrl: "/",
    }).catch((error) => {
      console.error("SSO callback error:", error);
      router.replace("/(auth)/login");
    });
  }, [clerk.loaded]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#FF6B35" />
    </View>
  );
}
