import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ExternalAccountResource, OAuthStrategy } from "@clerk/types";

WebBrowser.maybeCompleteAuthSession();

type ProviderOption = {
  strategy: OAuthStrategy;
  providerId: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
};

const PROVIDER_OPTIONS: ProviderOption[] = [
  {
    strategy: "oauth_google",
    providerId: "google",
    label: "Google",
    icon: "logo-google",
    iconColor: "#EA4335",
  },
  {
    strategy: "oauth_apple",
    providerId: "apple",
    label: "Apple",
    icon: "logo-apple",
    iconColor: "#0F172A",
  },
  {
    strategy: "oauth_facebook",
    providerId: "facebook",
    label: "Facebook",
    icon: "logo-facebook",
    iconColor: "#1877F2",
  },
  {
    strategy: "oauth_x",
    providerId: "x",
    label: "X",
    icon: "logo-twitter",
    iconColor: "#0F172A",
  },
];

function getProviderMeta(provider: string): Pick<ProviderOption, "label" | "icon" | "iconColor"> {
  const known = PROVIDER_OPTIONS.find((p) => p.providerId === provider);
  if (known) return { label: known.label, icon: known.icon, iconColor: known.iconColor };
  return {
    label: provider.charAt(0).toUpperCase() + provider.slice(1),
    icon: "link-outline",
    iconColor: "#64748B",
  };
}

function getAccountDisplayName(account: ExternalAccountResource): string {
  return (
    account.emailAddress ||
    account.username ||
    [account.firstName, account.lastName].filter(Boolean).join(" ") ||
    "Connected"
  );
}

export default function LinkedAccounts() {
  const { user, isLoaded } = useUser();
  const [linkingStrategy, setLinkingStrategy] = useState<OAuthStrategy | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState<ExternalAccountResource | null>(null);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const externalAccounts = user?.externalAccounts ?? [];
  const verifiedAccounts = externalAccounts.filter(
    (a) => a.verification?.status === "verified"
  );
  const passwordEnabled = user?.passwordEnabled ?? false;
  const isOnlyLoginMethod = verifiedAccounts.length === 1 && !passwordEnabled;

  const connectedProviderIds: string[] = externalAccounts.map((a) => a.provider);
  const availableToLink = PROVIDER_OPTIONS.filter(
    (opt) => !connectedProviderIds.includes(opt.providerId)
  );

  const handleLink = useCallback(
    async (strategy: OAuthStrategy) => {
      if (!user) return;
      setLinkingStrategy(strategy);
      try {
        const redirectUrl = AuthSession.makeRedirectUri({ scheme: "betrfood" });
        const externalAccount = await user.createExternalAccount({
          strategy,
          redirectUrl,
        });

        const verificationUrl =
          externalAccount.verification?.externalVerificationRedirectURL?.toString();

        if (verificationUrl) {
          await WebBrowser.openAuthSessionAsync(verificationUrl, redirectUrl);
        }

        await user.reload();
      } catch (err: any) {
        const msg =
          err?.errors?.[0]?.longMessage ||
          err?.errors?.[0]?.message ||
          err?.message ||
          "Could not link account. Please try again.";
        Alert.alert("Link Failed", msg);
      } finally {
        setLinkingStrategy(null);
      }
    },
    [user]
  );

  const handleUnlink = useCallback(
    async (account: ExternalAccountResource) => {
      if (!user) return;
      setUnlinkingId(account.id);
      try {
        await account.destroy();
        await user.reload();
      } catch (err: any) {
        const msg =
          err?.errors?.[0]?.longMessage ||
          err?.errors?.[0]?.message ||
          err?.message ||
          "Could not unlink account. Please try again.";
        Alert.alert("Unlink Failed", msg);
      } finally {
        setUnlinkingId(null);
        setConfirmUnlink(null);
      }
    },
    [user]
  );

  if (!isLoaded || !user) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]} edges={["bottom"]}>
        <ActivityIndicator size="large" color="#22C55E" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Link accounts you use to sign in to BetrFood. You can add or remove providers
          at any time.
        </Text>

        {isOnlyLoginMethod && (
          <View style={styles.warningBanner}>
            <Ionicons name="information-circle-outline" size={18} color="#B45309" />
            <Text style={styles.warningText}>
              This is your only sign-in method. Add a password or link another account
              before removing it.
            </Text>
          </View>
        )}

        <Text style={styles.sectionHeader}>CONNECTED</Text>
        <View style={styles.card}>
          {externalAccounts.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No linked accounts yet.</Text>
            </View>
          ) : (
            externalAccounts.map((account, index) => {
              const meta = getProviderMeta(account.provider);
              const disableUnlink =
                isOnlyLoginMethod && verifiedAccounts[0]?.id === account.id;
              const isUnlinking = unlinkingId === account.id;
              const isUnverified = account.verification?.status !== "verified";
              return (
                <View key={account.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <View style={styles.accountRow}>
                    <View style={styles.accountInfo}>
                      <View style={[styles.iconCircle, { backgroundColor: `${meta.iconColor}14` }]}>
                        <Ionicons name={meta.icon} size={20} color={meta.iconColor} />
                      </View>
                      <View style={styles.accountText}>
                        <Text style={styles.providerLabel}>{meta.label}</Text>
                        <Text style={styles.accountDetail} numberOfLines={1}>
                          {getAccountDisplayName(account)}
                        </Text>
                        <Text
                          style={[
                            styles.statusLabel,
                            isUnverified ? styles.statusWarn : styles.statusOk,
                          ]}
                        >
                          {isUnverified ? "Needs verification" : "Connected"}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      style={[
                        styles.unlinkButton,
                        (disableUnlink || isUnlinking) && styles.unlinkButtonDisabled,
                      ]}
                      onPress={() => setConfirmUnlink(account)}
                      disabled={disableUnlink || isUnlinking}
                      accessibilityRole="button"
                      accessibilityLabel={`Unlink ${meta.label}`}
                    >
                      {isUnlinking ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Text
                          style={[
                            styles.unlinkText,
                            disableUnlink && styles.unlinkTextDisabled,
                          ]}
                        >
                          Unlink
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {availableToLink.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>ADD AN ACCOUNT</Text>
            <View style={styles.card}>
              {availableToLink.map((opt, index) => {
                const isLoading = linkingStrategy === opt.strategy;
                const anyLoading = linkingStrategy !== null;
                return (
                  <View key={opt.strategy}>
                    {index > 0 && <View style={styles.divider} />}
                    <Pressable
                      style={[styles.addRow, anyLoading && !isLoading && { opacity: 0.5 }]}
                      onPress={() => handleLink(opt.strategy)}
                      disabled={anyLoading}
                      accessibilityRole="button"
                      accessibilityLabel={`Link ${opt.label}`}
                    >
                      <View style={styles.accountInfo}>
                        <View
                          style={[styles.iconCircle, { backgroundColor: `${opt.iconColor}14` }]}
                        >
                          <Ionicons name={opt.icon} size={20} color={opt.iconColor} />
                        </View>
                        <Text style={styles.providerLabel}>{opt.label}</Text>
                      </View>
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#22C55E" />
                      ) : (
                        <Text style={styles.linkActionText}>Link</Text>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={confirmUnlink !== null}
        transparent
        animationType="fade"
        onRequestClose={() => !unlinkingId && setConfirmUnlink(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !unlinkingId && setConfirmUnlink(null)}
        >
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalIconRow}>
              <Ionicons name="unlink-outline" size={28} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>
              Unlink {confirmUnlink ? getProviderMeta(confirmUnlink.provider).label : ""}?
            </Text>
            <Text style={styles.modalMessage}>
              You will no longer be able to sign in with this provider until you link it
              again.
            </Text>
            <Pressable
              style={[styles.modalDeleteButton, unlinkingId !== null && { opacity: 0.6 }]}
              onPress={() => confirmUnlink && handleUnlink(confirmUnlink)}
              disabled={unlinkingId !== null}
            >
              <Text style={styles.modalDeleteText}>
                {unlinkingId ? "Unlinking..." : "Unlink"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.modalCancelButton}
              onPress={() => setConfirmUnlink(null)}
              disabled={unlinkingId !== null}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  intro: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 16,
  },
  warningBanner: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#92400E",
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
  },
  emptyRow: {
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748B",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  accountInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  accountText: {
    flex: 1,
  },
  providerLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  accountDetail: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  statusLabel: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  statusOk: {
    color: "#22C55E",
  },
  statusWarn: {
    color: "#B45309",
  },
  unlinkButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    minWidth: 72,
    alignItems: "center",
  },
  unlinkButtonDisabled: {
    backgroundColor: "#F1F5F9",
  },
  unlinkText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
  },
  unlinkTextDisabled: {
    color: "#94A3B8",
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  linkActionText: {
    color: "#22C55E",
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  modalIconRow: {
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalDeleteButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  modalDeleteText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  modalCancelButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "500",
  },
});
