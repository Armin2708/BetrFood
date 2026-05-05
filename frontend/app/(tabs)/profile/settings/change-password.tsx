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

// ── Password strength ─────────────────────────────────────────────────────────

interface PasswordCriteria {
  hasLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

function evaluatePassword(password: string): { strength: StrengthLevel; criteria: PasswordCriteria } {
  const criteria: PasswordCriteria = {
    hasLength: password.length >= 8,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^a-zA-Z0-9]/.test(password),
  };
  const met = Object.values(criteria).filter(Boolean).length;
  const strength: StrengthLevel = met === 0 ? 0 : met <= 2 ? 1 : met === 3 ? 2 : met === 4 ? 3 : 4;
  return { strength, criteria };
}

const STRENGTH_LABEL: Record<StrengthLevel, string> = { 0: '', 1: 'Weak', 2: 'Fair', 3: 'Good', 4: 'Strong' };
const STRENGTH_COLOR: Record<StrengthLevel, string> = {
  0: 'transparent',
  1: '#EF4444',
  2: '#F97316',
  3: '#22C55E',
  4: '#16A34A',
};

const CRITERIA_ITEMS: { key: keyof PasswordCriteria; label: string }[] = [
  { key: 'hasLength', label: 'At least 8 characters' },
  { key: 'hasUpper',  label: 'Uppercase letter (A–Z)' },
  { key: 'hasNumber', label: 'Number (0–9)' },
  { key: 'hasSpecial', label: 'Special character (!@#…)' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChangePasswordScreen() {
  const { colors } = useAppTheme();
  const scaledTypography = useScaledTypography();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useUser();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { strength, criteria } = useMemo(() => evaluatePassword(next), [next]);
  const strengthColor = STRENGTH_COLOR[strength];
  const strengthLabel = STRENGTH_LABEL[strength];

  const passwordsMatch = confirm.length > 0 && next === confirm;
  const passwordsMismatch = confirm.length > 0 && next !== confirm;

  const canSubmit =
    !submitting &&
    current.length > 0 &&
    criteria.hasLength &&
    passwordsMatch;

  const handleSubmit = useCallback(async () => {
    setError("");

    if (!current) { setError("Please enter your current password."); return; }
    if (!criteria.hasLength) { setError("New password must be at least 8 characters."); return; }
    if (!passwordsMatch) { setError("Passwords do not match."); return; }

    setSubmitting(true);
    try {
      await user?.updatePassword({ currentPassword: current, newPassword: next, signOutOfOtherSessions: false });
      Alert.alert(
        "Password changed",
        "Your password has been updated. A confirmation has been sent to your email.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err: any) {
      const clerkMsg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message;
      setError(clerkMsg || (err instanceof Error ? err.message : "Something went wrong."));
    } finally {
      setSubmitting(false);
    }
  }, [current, next, criteria.hasLength, passwordsMatch, user]);

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
          {/* ── Current password ── */}
          <Text style={[scaledTypography.caption, styles.sectionHeader, { color: colors.textTertiary }]}>
            CURRENT PASSWORD
          </Text>
          <View style={[styles.card, { backgroundColor: colors.backgroundElevated }]}>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput, scaledTypography.body, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                value={current}
                onChangeText={(t) => { setCurrent(t); setError(""); }}
                placeholder="Enter current password"
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                returnKeyType="next"
              />
              <Pressable style={styles.eyeButton} onPress={() => setShowCurrent((v) => !v)} hitSlop={8}>
                <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textTertiary} />
              </Pressable>
            </View>
          </View>

          {/* ── New password ── */}
          <Text style={[scaledTypography.caption, styles.sectionHeader, { color: colors.textTertiary }]}>
            NEW PASSWORD
          </Text>
          <View style={[styles.card, { backgroundColor: colors.backgroundElevated }]}>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput, scaledTypography.body, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
                value={next}
                onChangeText={(t) => { setNext(t); setError(""); }}
                placeholder="Enter new password"
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!showNext}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                returnKeyType="next"
              />
              <Pressable style={styles.eyeButton} onPress={() => setShowNext((v) => !v)} hitSlop={8}>
                <Ionicons name={showNext ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textTertiary} />
              </Pressable>
            </View>

            {/* Strength bar */}
            {next.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBars}>
                  {([1, 2, 3, 4] as StrengthLevel[]).map((level) => (
                    <View
                      key={level}
                      style={[styles.strengthBar, { backgroundColor: level <= strength ? strengthColor : colors.border }]}
                    />
                  ))}
                </View>
                <Text style={[scaledTypography.small, { color: strengthColor, minWidth: 42, textAlign: "right" }]}>
                  {strengthLabel}
                </Text>
              </View>
            )}

            {/* Criteria checklist */}
            {next.length > 0 && (
              <View style={styles.criteriaList}>
                {CRITERIA_ITEMS.map(({ key, label }) => (
                  <View key={key} style={styles.criteriaRow}>
                    <Ionicons
                      name={criteria[key] ? "checkmark-circle" : "ellipse-outline"}
                      size={15}
                      color={criteria[key] ? colors.primaryDark : colors.textTertiary}
                    />
                    <Text style={[scaledTypography.small, { color: criteria[key] ? colors.primaryDark : colors.textTertiary }]}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── Confirm password ── */}
          <Text style={[scaledTypography.caption, styles.sectionHeader, { color: colors.textTertiary }]}>
            CONFIRM NEW PASSWORD
          </Text>
          <View style={[styles.card, { backgroundColor: colors.backgroundElevated }]}>
            <View style={styles.passwordRow}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  scaledTypography.body,
                  {
                    color: colors.textPrimary,
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: passwordsMismatch ? colors.error : passwordsMatch ? colors.primaryDark : colors.border,
                  },
                ]}
                value={confirm}
                onChangeText={(t) => { setConfirm(t); setError(""); }}
                placeholder="Re-enter new password"
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <Pressable style={styles.eyeButton} onPress={() => setShowConfirm((v) => !v)} hitSlop={8}>
                <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textTertiary} />
              </Pressable>
            </View>

            {/* Match status */}
            {confirm.length > 0 && (
              <View style={styles.matchRow}>
                <Ionicons
                  name={passwordsMatch ? "checkmark-circle" : "close-circle"}
                  size={15}
                  color={passwordsMatch ? colors.primaryDark : colors.error}
                />
                <Text style={[scaledTypography.small, { color: passwordsMatch ? colors.primaryDark : colors.error }]}>
                  {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                </Text>
              </View>
            )}
          </View>

          {/* ── Error ── */}
          {error ? (
            <View style={[styles.errorCard, { backgroundColor: colors.backgroundElevated, borderColor: colors.error }]}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={[scaledTypography.small, styles.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          ) : null}

          {/* ── Submit ── */}
          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.primaryDark }, !canSubmit && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[scaledTypography.body, styles.primaryButtonText, { color: colors.white }]}>
                Update Password
              </Text>
            )}
          </Pressable>

          <Text style={[scaledTypography.small, styles.hint, { color: colors.textTertiary }]}>
            A confirmation email will be sent to your account address after the change.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    flex: { flex: 1 },
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
    passwordRow: {
      position: "relative",
    },
    input: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
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
    strengthContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 12,
    },
    strengthBars: {
      flex: 1,
      flexDirection: "row",
      gap: 4,
    },
    strengthBar: {
      flex: 1,
      height: 4,
      borderRadius: 2,
    },
    criteriaList: {
      marginTop: 12,
      gap: 6,
    },
    criteriaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    matchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 10,
    },
    errorCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 16,
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
    hint: {
      textAlign: "center",
      lineHeight: 18,
      marginTop: 12,
      paddingHorizontal: 8,
    },
  });
}
