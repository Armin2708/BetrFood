import React, { useState } from "react";
import { useRouter } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type Requirement = {
  label: string;
  test: (p: string) => boolean;
};

const REQUIREMENTS: Requirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One number", test: (p) => /[0-9]/.test(p) },
  { label: "One special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function NewPasswordScreen() {
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const { signIn, isLoaded, setActive } = useSignIn();
  const router = useRouter();

  const metCount = REQUIREMENTS.filter((r) => r.test(password)).length;

  const strengthColors = REQUIREMENTS.map((_, i) =>
    i < metCount ? "#22C55E" : "#E2E8F0"
  );

  const showError = (msg: string) => {
    if (Platform.OS === "web") {
      window.alert(msg);
    } else {
      Alert.alert("Error", msg);
    }
  };

  const handleSetPassword = async () => {
    if (!isLoaded) return;
    if (!password.trim()) {
      showError("Please enter a new password.");
      return;
    }
    if (metCount < REQUIREMENTS.length) {
      showError("Please meet all password requirements.");
      return;
    }
    if (password !== confirmPassword) {
      showError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.resetPassword({ password });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/resetPassword/resetConfirmation");
      } else {
        showError(
          "Password reset incomplete. Additional verification may be required."
        );
      }
    } catch (error: any) {
      const msg =
        error.errors?.[0]?.longMessage ||
        error.errors?.[0]?.message ||
        error.message ||
        "Failed to reset password.";
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="key-outline" size={36} color="#22C55E" />
        </View>

        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Create a new secure password for your account.
        </Text>

        {/* New Password */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              accessibilityLabel="New password"
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#94A3B8"
              />
            </Pressable>
          </View>

          {/* Strength bar */}
          {password.length > 0 && (
            <View style={styles.strengthBar}>
              {strengthColors.map((color, i) => (
                <View
                  key={i}
                  style={[styles.strengthSegment, { backgroundColor: color }]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Confirm Password */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Re-enter new password"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              accessibilityLabel="Confirm password"
            />
            <Pressable
              onPress={() => setShowConfirm(!showConfirm)}
              style={styles.eyeIcon}
              accessibilityRole="button"
              accessibilityLabel={showConfirm ? "Hide password" : "Show password"}
            >
              <Ionicons
                name={showConfirm ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#94A3B8"
              />
            </Pressable>
          </View>
        </View>

        {/* Requirements */}
        <View style={styles.requirementsBox}>
          <Text style={styles.requirementsTitle}>Password Requirements</Text>
          {REQUIREMENTS.map((req) => {
            const met = req.test(password);
            return (
              <View key={req.label} style={styles.requirementRow}>
                <View
                  style={[
                    styles.requirementIcon,
                    met
                      ? styles.requirementIconMet
                      : styles.requirementIconUnmet,
                  ]}
                >
                  {met && (
                    <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                  )}
                </View>
                <Text
                  style={[
                    styles.requirementText,
                    met && styles.requirementTextMet,
                  ]}
                >
                  {req.label}
                </Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleSetPassword}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Reset password"
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#22C55E", "#10B981"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 36,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  fieldWrapper: {
    width: "100%",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 8,
  },
  inputRow: {
    position: "relative",
  },
  input: {
    width: "100%",
    height: 52,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingRight: 48,
    fontSize: 15,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    top: 16,
  },
  strengthBar: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  requirementsBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 10,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  requirementIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  requirementIconMet: {
    backgroundColor: "#22C55E",
  },
  requirementIconUnmet: {
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "transparent",
  },
  requirementText: {
    fontSize: 13,
    color: "#64748B",
  },
  requirementTextMet: {
    color: "#22C55E",
  },
  button: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
