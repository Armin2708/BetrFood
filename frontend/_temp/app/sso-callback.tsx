import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useClerk } from "@clerk/clerk-expo";

export default function SSOCallback() {
  const clerk = useClerk();

  useEffect(() => {
    if (!clerk.loaded) return;

    clerk.handleRedirectCallback({
      afterSignInUrl: "/",
      afterSignUpUrl: "/",
      redirectUrl: "/",
    }).catch((error) => {
      console.error("SSO callback error:", error);
      window.location.href = "/(auth)/login";
    });
  }, [clerk.loaded]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#FF6B35" />
    </View>
  );
}
