import React from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@clerk/clerk-expo";

export default function ResetSuccessScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleBackToLogin = async () => {
    await signOut();
    router.dismissTo("/(auth)/login");
  };

  return (
    <View style={styles.container}>
      {/* Success icon */}
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={["#22C55E", "#10B981"]}
          style={styles.iconGradient}
        >
          <Text style={styles.iconText}>✓</Text>
        </LinearGradient>
      </View>

      <Text style={styles.title}>Password Reset!</Text>
      <Text style={styles.subtitle}>
        Your password has been updated successfully. You can now log in with
        your new password.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleBackToLogin}
        accessibilityRole="button"
        accessibilityLabel="Go to login"
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={["#22C55E", "#10B981"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.buttonGradient}
        >
          <Text style={styles.buttonText}>Back to Login</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  iconContainer: {
    marginBottom: 28,
    borderRadius: 50,
    overflow: "hidden",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  iconGradient: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 40,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  button: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
});
