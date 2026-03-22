import React from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function ResetSuccessScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Logo */}
      <Image
        source={require("../../../assets/images/Logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

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
        onPress={() => router.dismissTo("/(auth)/login")}
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
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 32,
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
