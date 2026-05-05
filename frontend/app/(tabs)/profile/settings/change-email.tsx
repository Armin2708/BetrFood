import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useAppTheme } from "../../../../context/ThemeContext";
import { useScaledTypography } from "../../../../hooks/useScaledTypography";
import { confirmEmailChange, requestEmailChange } from "../../../../services/api";

type Step = "request" | "verify";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ChangeEmailScreen() {
  const { colors } = useAppTheme();
  const scaledTypography = useScaledTypography();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { user } = useUser();
  const currentEmail = user?.primaryEmailAddress?.emailAddress ?? "";

  const [step, setStep] = useState<Step>("request");

  // Step 1 fields
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requesting, setRequesting] = useState(false);

  // Step 2 fields
  const [emailAddressId, setEmailAddressId] = useState("");
  const [code, setCode] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [confirming, setConfirming] = useState(false);

  const handleRequest = useCallback(async () => {
    setRequestError("");

    if (!newEmail.trim()) {
      setRequestError("Please enter your new email address.");
      return;
    }
    if (!isValidEmail(newEmail)) {
      setRequestError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setRequestError("Please enter your current password.");
      return;
    }

    setRequesting(true);
    try {
      const result = await requestEmailChange(newEmail.trim().toLowerCase(), password);
      setEmailAddressId(result.emailAddressId);
      setStep("verify");
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRequesting(false);
    }
  }, [newEmail, password]);

  const handleConfirm = useCallback(async () => {
    setConfirmError("");

    if (!code.trim()) {
      setConfirmError("Please enter the verification code.");
      return;
    }

    setConfirming(true);
    try {
      await confirmEmailChange(emailAddressId, code.trim());
      Alert.alert(
        "Email updated",
        "Your email address has been changed successfully. You may need to sign in again.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setConfirming(false);
    }
  }, [emailAddressId, code]);

  const handleBackToRequest = useCallback(() => {
    setStep("request");
    setCode("");
    setConfirmError("");
    setEmailAddressId("");
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, scaledTypography.label, { color: colors.textPrimary }]}>
          Change Email
        </Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === "request" ? (
            <>
              <View style={[styles.card, { backgroundColor: colors.backgroundElevated }]}>
                <Text style={[scaledTypography.caption, styles.fieldLabel, { color: colors.textTertiary }]}>
                  CURRENT EMAIL
                </Text>
                <Text style={[scaledTypography.body, { color: colors.textSecondary }]}>
                  {currentEmail || "—"}
                </Text>
              </View>

              <View style={[styles.card, { backgroundColor: colors.backgroundElevated }]}>
                <Text style={[scaledTypography.caption, styles.fieldLabel, { color: colors.textTertiary }]}>
                  NEW EMAIL ADDRESS
                </Text>
                <TextInput
                  style={[styles.input, scaledTypography.body, { color: colors.textPrimary, borderColor: colors.border }]}
                  value={newEmail}
                  onChangeText={(t) => { setNewEmail(t); setRequestError(""); }}
                  placeholder="Enter new email"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="next"
                />

                <Text style={[scaledTypography.caption, styles.fieldLabel, styles.fieldLabelSpaced, { color: colors.textTertiary }]}>
                  CURRENT PASSWORD
                </Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, styles.passwordInput, scaledTypography.body, { color: colors.textPrimary, borderColor: colors.border }]}
                    value={password}
                    onChangeText={(t) => { setPassword(t); setRequestError(""); }}
                    placeholder="Enter current password"
                    placeholderTextColor={colors.textTertiary}
                    secureTextEntry={!passwordVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="current-password"
                    returnKeyType="done"
                    onSubmitEditing={handleRequest}
                  />
                  <Pressable
                    style={styles.eyeButton}
                    onPress={() => setPasswordVisible((v) => !v)}
                  >
                    <Ionicons
                      name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.textTertiary}
                    />
                  </Pressable>
                </View>

                {requestError ? (
                  <Text style={[scaledTypography.small, styles.errorText]}>{requestError}</Text>
                ) : null}
              </View>

              <Pressable
                style={[styles.primaryButton, requesting && styles.buttonDisabled]}
                onPress={handleRequest}
                disabled={requesting}
              >
                {requesting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[scaledTypography.body, styles.primaryButtonText]}>
                    Send Verification Code
                  </Text>
                )}
              </Pressable>

              <Text style={[scaledTypography.small, styles.hint, { color: colors.textTertiary }]}>
                A 6-digit verification code will be sent to your new email address. Your old email will also receive a security notification.
              </Text>
            </>
          ) : (
            <>
              <View style={styles.verifyIconRow}>
                <View style={[styles.verifyIconCircle, { backgroundColor: colors.backgroundElevated }]}>
                  <Ionicons name="mail-outline" size={32} color={colors.primaryDark ?? "#2563EB"} />
                </View>
                <Text style={[scaledTypography.label, styles.verifyTitle, { color: colors.textPrimary }]}>
                  Check your new inbox
                </Text>
                <Text style={[scaledTypography.body, styles.verifySubtitle, { color: colors.textSecondary }]}>
                  We sent a 6-digit code to{"\n"}
                  <Text style={{ color: colors.textPrimary }}>{newEmail.trim().toLowerCase()}</Text>
                </Text>
              </View>

              <View style={[styles.card, { backgroundColor: colors.backgroundElevated }]}>
                <Text style={[scaledTypography.caption, styles.fieldLabel, { color: colors.textTertiary }]}>
                  VERIFICATION CODE
                </Text>
                <TextInput
                  style={[styles.input, styles.codeInput, scaledTypography.body, { color: colors.textPrimary, borderColor: colors.border }]}
                  value={code}
                  onChangeText={(t) => { setCode(t.replace(/\D/g, "").slice(0, 6)); setConfirmError(""); }}
                  placeholder="______"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleConfirm}
                  maxLength={6}
                />
                {confirmError ? (
                  <Text style={[scaledTypography.small, styles.errorText]}>{confirmError}</Text>
                ) : null}
              </View>

              <Pressable
                style={[styles.primaryButton, (confirming || code.length < 6) && styles.buttonDisabled]}
                onPress={handleConfirm}
                disabled={confirming || code.length < 6}
              >
                {confirming ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[scaledTypography.body, styles.primaryButtonText]}>Confirm Change</Text>
                )}
              </Pressable>

              <Pressable style={styles.secondaryButton} onPress={handleBackToRequest} disabled={confirming}>
                <Text style={[scaledTypography.body, styles.secondaryButtonText, { color: colors.textSecondary }]}>
                  Use a different email
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    flex: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.backgroundElevated,
    },
    backButton: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      textAlign: "center",
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 48,
      gap: 16,
    },
    card: {
      borderRadius: 18,
      padding: 16,
    },
    fieldLabel: {
      letterSpacing: 0.4,
      textTransform: "uppercase",
      marginBottom: 8,
    },
    fieldLabelSpaced: {
      marginTop: 16,
    },
    input: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    passwordRow: {
      position: "relative",
    },
    passwordInput: {
      paddingRight: 44,
    },
    eyeButton: {
      position: "absolute",
      right: 12,
      top: 0,
      bottom: 0,
      justifyContent: "center",
    },
    codeInput: {
      letterSpacing: 8,
      textAlign: "center",
      fontSize: 22,
    },
    errorText: {
      color: "#EF4444",
      marginTop: 8,
    },
    primaryButton: {
      backgroundColor: "#2563EB",
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonText: {
      color: "#fff",
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    secondaryButton: {
      alignItems: "center",
      paddingVertical: 10,
    },
    secondaryButtonText: {},
    hint: {
      textAlign: "center",
      lineHeight: 18,
      paddingHorizontal: 4,
    },
    verifyIconRow: {
      alignItems: "center",
      paddingTop: 16,
      paddingBottom: 8,
      gap: 12,
    },
    verifyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    verifyTitle: {
      textAlign: "center",
    },
    verifySubtitle: {
      textAlign: "center",
      lineHeight: 22,
    },
  });
}
