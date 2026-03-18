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
    }).then(() => {
      router.replace("/");
    }).catch((error) => {
      console.error("SSO callback error:", error);
      router.replace("/(auth)/login");
    });
  }, [clerk.loaded]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#22C55E" />
    </View>
  );
}
