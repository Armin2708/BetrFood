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
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { ThemeColors } from "../../../../constants/theme";
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

  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requesting, setRequesting] = useState(false);

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
        "Your email address has been changed. You may need to sign in again.",
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
    <View style={styles.container}>
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
              <Text style={[scaledTypography.caption, styles.sectionHeader, { color: colors.textTertiary }]}>
                CURRENT EMAIL
              </Text>
              <View style={[styles.card, { backgroundColor: colors.backgroundElevated }]}>
                <Text style={[scaledTypography.body, { color: colors.textSecondary }]}>
                  {currentEmail || "—"}
                </Text>
              </View>

              <Text style={[scaledTypography.caption, styles.sectionHeader, { color: colors.textTertiary }]}>
                NEW EMAIL ADDRESS
              </Text>
              <View style={[styles.card, { backgroundColor: colors.backgroundElevated }]}>
                <TextInput
                  style={[styles.input, scaledTypography.body, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                  value={newEmail}
                  onChangeText={(t) => { setNewEmail(t); setRequestError(""); }}
                  placeholder="Enter new email address"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="next"
                />
              </View>

              <Text style={[scaledTypography.caption, styles.sectionHeader, { color: colors.textTertiary }]}>
                CURRENT PASSWORD
              </Text>
              <View style={[styles.card, { backgroundColor: colors.backgroundElevated }]}>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, styles.passwordInput, scaledTypography.body, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                    value={password}
                    onChangeText={(t) => { setPassword(t); setRequestError(""); }}
                    placeholder="Enter current password"
                    placeholderTextColor={colors.placeholder}
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
                    hitSlop={8}
                  >
                    <Ionicons
                      name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.textTertiary}
                    />
                  </Pressable>
                </View>
              </View>

              {requestError ? (
                <View style={[styles.errorCard, { backgroundColor: colors.backgroundElevated, borderColor: colors.error }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                  <Text style={[scaledTypography.small, styles.errorText, { color: colors.error }]}>{requestError}</Text>
                </View>
              ) : null}

              <Pressable
                style={[styles.primaryButton, { backgroundColor: colors.primaryDark }, requesting && styles.buttonDisabled]}
                onPress={handleRequest}
                disabled={requesting}
              >
                {requesting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={[scaledTypography.body, styles.primaryButtonText, { color: colors.white }]}>
                    Send Verification Code
                  </Text>
                )}
              </Pressable>

              <Text style={[scaledTypography.small, styles.hint, { color: colors.textTertiary }]}>
                A 6-digit code will be sent to your new email. Your old email will also receive a security notification.
              </Text>
            </>
          ) : (
            <>
              <View style={styles.verifyHero}>
                <View style={[styles.verifyIconCircle, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
                  <Ionicons name="mail-outline" size={32} color={colors.primaryDark} />
                </View>
                <Text style={[scaledTypography.label, { color: colors.textPrimary, textAlign: "center" }]}>
                  Check your new inbox
                </Text>
                <Text style={[scaledTypography.body, { color: colors.textSecondary, textAlign: "center", lineHeight: 22 }]}>
                  {"We sent a 6-digit code to\n"}
                  <Text style={{ color: colors.textPrimary }}>{newEmail.trim().toLowerCase()}</Text>
                </Text>
              </View>

              <Text style={[scaledTypography.caption, styles.sectionHeader, { color: colors.textTertiary }]}>
                VERIFICATION CODE
              </Text>
              <View style={[styles.card, { backgroundColor: colors.backgroundElevated }]}>
                <TextInput
                  style={[styles.input, styles.codeInput, scaledTypography.body, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                  value={code}
                  onChangeText={(t) => { setCode(t.replace(/\D/g, "").slice(0, 6)); setConfirmError(""); }}
                  placeholder="• • • • • •"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleConfirm}
                  maxLength={6}
                />
              </View>

              {confirmError ? (
                <View style={[styles.errorCard, { backgroundColor: colors.backgroundElevated, borderColor: colors.error }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                  <Text style={[scaledTypography.small, styles.errorText, { color: colors.error }]}>{confirmError}</Text>
                </View>
              ) : null}

              <Pressable
                style={[styles.primaryButton, { backgroundColor: colors.primaryDark }, (confirming || code.length < 6) && styles.buttonDisabled]}
                onPress={handleConfirm}
                disabled={confirming || code.length < 6}
              >
                {confirming ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={[scaledTypography.body, styles.primaryButtonText, { color: colors.white }]}>
                    Confirm Change
                  </Text>
                )}
              </Pressable>

              <Pressable style={styles.secondaryButton} onPress={handleBackToRequest} disabled={confirming}>
                <Text style={[scaledTypography.body, { color: colors.textSecondary }]}>
                  Use a different email
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    flex: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 48,
    },
    sectionHeader: {
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginTop: 24,
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      borderRadius: 18,
      padding: 16,
    },
    input: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    passwordRow: {
      position: "relative",
    },
    passwordInput: {
      paddingRight: 46,
    },
    eyeButton: {
      position: "absolute",
      right: 12,
      top: 0,
      bottom: 0,
      justifyContent: "center",
    },
    codeInput: {
      textAlign: "center",
      letterSpacing: 12,
      fontSize: 22,
    },
    errorCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
    },
    errorText: {
      flex: 1,
    },
    primaryButton: {
      marginTop: 24,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonText: {
      fontWeight: "600",
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    secondaryButton: {
      alignItems: "center",
      paddingVertical: 14,
    },
    hint: {
      textAlign: "center",
      lineHeight: 18,
      marginTop: 12,
      paddingHorizontal: 8,
    },
    verifyHero: {
      alignItems: "center",
      paddingTop: 24,
      paddingBottom: 8,
      gap: 12,
    },
    verifyIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },
  });
}
