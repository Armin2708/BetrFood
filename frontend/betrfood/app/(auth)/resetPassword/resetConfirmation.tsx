import React from "react";
import { useRouter } from "expo-router"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

export default function ResetSuccessScreen() {
    const router = useRouter()

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✅</Text>

      <Text style={styles.title}>Password Reset Successful!</Text>

      <Text style={styles.subtitle}>
        Your password has been updated. You can now log in with your new password.
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => router.dismissTo('/login')}>
        <Text style={styles.buttonText}>Go to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },

  icon: {
    fontSize: 64,
    marginBottom: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
  },

  button: {
    backgroundColor: "#90ee90",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 10,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});