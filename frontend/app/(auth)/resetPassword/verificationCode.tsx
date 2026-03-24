import React, { useRef, useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
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
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  KeyboardAvoidingView,
  ScrollView,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const RESEND_COOLDOWN = 60;

export default function VerificationCodeScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(RESEND_COOLDOWN);
  const { signIn, isLoaded } = useSignIn();
  const inputs = useRef<Array<TextInput | null>>([]);
  const router = useRouter();

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const showError = (msg: string) => {
    if (Platform.OS === "web") {
      window.alert(msg);
    } else {
      Alert.alert("Error", msg);
    }
  };

  const handleVerify = async () => {
    if (!isLoaded || !signIn) return;
    const codeString = code.join("");
    if (codeString.length !== 6) {
      showError("Please enter the full 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: codeString,
      });

      if (result.status === "needs_new_password") {
        router.push("/resetPassword/setNewPassword");
      } else {
        showError("Unexpected status. Please try again.");
      }
    } catch (error: any) {
      const msg =
        error.errors?.[0]?.longMessage ||
        error.errors?.[0]?.message ||
        error.message ||
        "Invalid verification code.";
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (!isLoaded || !signIn || cooldown > 0) return;
    try {
      const emailFactor = signIn.supportedFirstFactors?.find(
        (f: any) => f.strategy === "reset_password_email_code"
      ) as any;
      await signIn.prepareFirstFactor({
        strategy: "reset_password_email_code",
        emailAddressId: emailFactor?.emailAddressId,
      });
      setCooldown(RESEND_COOLDOWN);
      if (Platform.OS === "web") {
        window.alert("A new verification code was sent.");
      } else {
        Alert.alert("Code Sent", "A new verification code was sent.");
      }
    } catch (error: any) {
      const msg =
        error.errors?.[0]?.longMessage ||
        error.errors?.[0]?.message ||
        error.message ||
        "Failed to resend code.";
      showError(msg);
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
          <Ionicons name="mail-outline" size={36} color="#22C55E" />
        </View>

        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit verification code to
        </Text>
        {email ? (
          <Text style={styles.emailText}>{email}</Text>
        ) : null}

        {/* Code inputs */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputs.current[index] = ref; }}
              style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleBackspace(e, index)}
              accessibilityLabel={`Digit ${index + 1}`}
            />
          ))}
        </View>

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Didn't receive the code? </Text>
          <Pressable
            onPress={resendCode}
            disabled={cooldown > 0 || loading}
            accessibilityRole="button"
          >
            <Text style={[styles.resendLink, (cooldown > 0 || loading) && styles.resendDisabled]}>
              Resend
            </Text>
          </Pressable>
        </View>
        {cooldown > 0 && (
          <Text style={styles.cooldownText}>
            Resend available in {formatTime(cooldown)}
          </Text>
        )}

        {/* Verify button */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleVerify}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Verify email"
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
              <Text style={styles.buttonText}>Verify Email</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Change email */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Change Email Address</Text>
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
    lineHeight: 20,
  },
  emailText: {
    fontSize: 14,
    color: "#22C55E",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 32,
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
    gap: 8,
  },
  codeInput: {
    flex: 1,
    height: 60,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  codeInputFilled: {
    borderColor: "#22C55E",
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  resendText: {
    fontSize: 14,
    color: "#64748B",
  },
  resendLink: {
    fontSize: 14,
    color: "#22C55E",
    fontWeight: "600",
  },
  resendDisabled: {
    color: "#94A3B8",
  },
  cooldownText: {
    fontSize: 13,
    color: "#94A3B8",
    marginBottom: 28,
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
    marginTop: 8,
    marginBottom: 12,
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
  secondaryButton: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
});
