import { View, Text, StyleSheet, Pressable, Alert, ScrollView, Image, Linking, Modal } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useClerk } from "@clerk/clerk-expo";
import { useContext, useState } from "react";
import { AuthContext } from "../../../../context/AuthenticationContext";
import { deleteAccount } from "../../../../services/api";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Settings() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useContext(AuthContext);

  const isAdminOrMod = user?.role === 'admin' || user?.role === 'moderator';
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.replace("/");
  };

  const handleDeleteAccount = () => setDeleteModalVisible(true);

  const confirmDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      await signOut();
      router.replace("/");
    } catch {
      setDeleteModalVisible(false);
      setDeleting(false);
      Alert.alert("Error", "Failed to delete account. Please try again.");
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo and Branding */}
        <View style={styles.brandSection}>
          <Image
            source={require("../../../../assets/images/Logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>BetrFood</Text>
          <Text style={styles.brandSubtitle}>Discover. Share. Eat Better.</Text>
        </View>

        {/* APP INFORMATION */}
        <Text style={styles.sectionHeader}>APP INFORMATION</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>2.4.1</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Build Number</Text>
            <Text style={styles.infoValue}>241</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Release Date</Text>
            <Text style={styles.infoValue}>March 2026</Text>
          </View>
        </View>

        {/* ABOUT */}
        <Text style={styles.sectionHeader}>ABOUT</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.navRow}
            onPress={() => router.push("/profile/settings/preferences" as any)}
          >
            <Text style={styles.navLabel}>Food Preferences</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.navRow}
            onPress={() => router.push("/profile/settings/linked-accounts" as any)}
          >
            <Text style={styles.navLabel}>Linked Accounts</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.navRow}
            onPress={() => router.push("/profile/settings/blocked" as any)}
          >
            <Text style={styles.navLabel}>Blocked & Muted</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
          <View style={styles.divider} />
        </View>

        {/* NOTIFICATIONS */}
        <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.navRow}
            onPress={() => router.push("/profile/settings/notifications" as any)}
          >
            <Text style={styles.navLabel}>Push Notifications</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
        </View>

        {/* APPEARANCE */}
        <Text style={styles.sectionHeader}>APPEARANCE</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.navRow}
            onPress={() => router.push("/profile/settings/appearance" as any)}
          >
            <Text style={styles.navLabel}>Feed Layout</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.navRow}
            onPress={() => router.push("/profile/settings/text-size" as any)}
          >
            <Text style={styles.navLabel}>Text Size</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
        </View>

        {/* DATA AND PRIVACY */}
        <Text style={styles.sectionHeader}>DATA AND PRIVACY</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.navRow}
            onPress={() => router.push("/profile/settings/privacy" as any)}
          >
            <Text style={styles.navLabel}>Privacy</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.navRow}
            onPress={() => router.push("/profile/settings/data-storage" as any)}
          >
            <Text style={styles.navLabel}>Data & Storage</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.navRow}
            onPress={() => router.push("/profile/settings/privacy-policy" as any)}
          >
            <Text style={styles.navLabel}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.navRow}
            onPress={() => router.push("/profile/settings/terms" as any)}
          >
            <Text style={styles.navLabel}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.navRow}
            onPress={() => router.push("/profile/settings/export-data" as any)}
          >
            <Text style={styles.navLabel}>Export My Data</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
        </View>

        {/* LEGAL AND RESOURCES */}
        <Text style={styles.sectionHeader}>LEGAL AND RESOURCES</Text>
        <View style={styles.card}>
          <Pressable style={styles.navRow}>
            <Text style={styles.navLabel}>Cookie Policy</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.navRow}>
            <Text style={styles.navLabel}>Open Source Licenses</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.navRow}>
            <Text style={styles.navLabel}>Acknowledgments</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.navRow}
            onPress={() => router.push("/profile/settings/bug-report" as any)}
          >
            <Text style={styles.navLabel}>Report a Bug</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.navRow}
            onPress={() => router.push("/profile/settings/help" as any)}
          >
            <Text style={styles.navLabel}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
        </View>

        <Text style={styles.sectionHeader}></Text>
        <View style={styles.card}>
          <Pressable style={styles.navRow} onPress={handleLogout}>
            <Text style={[styles.navLabel, { color: '#EF4444' }]}>Log Out</Text>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.navRow} onPress={handleDeleteAccount}>
            <Text style={[styles.navLabel, { color: '#EF4444' }]}>Delete Account</Text>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </Pressable>
        </View>

        {/* FOLLOW US */}
        <Text style={styles.sectionHeader}>FOLLOW US</Text>
        <View style={styles.socialRow}>
          <Pressable style={styles.socialIcon} onPress={() => openLink("https://instagram.com/betrfood")}>
            <Ionicons name="logo-instagram" size={22} color="#0F172A" />
          </Pressable>
          <Pressable style={styles.socialIcon} onPress={() => openLink("https://twitter.com/betrfood")}>
            <Ionicons name="logo-twitter" size={22} color="#0F172A" />
          </Pressable>
          <Pressable style={styles.socialIcon} onPress={() => openLink("https://tiktok.com/@betrfood")}>
            <Ionicons name="logo-tiktok" size={22} color="#0F172A" />
          </Pressable>
          <Pressable style={styles.socialIcon} onPress={() => openLink("https://facebook.com/betrfood")}>
            <Ionicons name="logo-facebook" size={22} color="#0F172A" />
          </Pressable>
        </View>

        {/* Admin Panel Link */}
        {isAdminOrMod && (
          <>
            <Text style={styles.sectionHeader}>ADMIN</Text>
            <View style={styles.card}>
              <Pressable
                style={styles.navRow}
                onPress={() => router.push('/admin' as any)}
              >
                <Text style={[styles.navLabel, { color: '#22C55E', fontWeight: '600' }]}>Admin Panel</Text>
                <Ionicons name="chevron-forward" size={18} color="#22C55E" />
              </Pressable>
            </View>
          </>
        )}

        {/* About Text */}
        <Text style={styles.aboutText}>
          BetrFood is made with love to help you discover healthier food choices, share recipes with friends, and build better eating habits together.
        </Text>

        {/* Copyright */}
        <Text style={styles.copyright}>
          {"\u00A9"} 2024 BetrFood, Inc. All rights reserved.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Delete account confirmation modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setDeleteModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => !deleting && setDeleteModalVisible(false)}>
          <Pressable style={styles.modalBox} onPress={e => e.stopPropagation()}>
            <View style={styles.modalIconRow}>
              <Ionicons name="warning-outline" size={32} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalMessage}>
              This action is permanent and cannot be undone. All your posts, comments, follows, and data will be permanently removed.
            </Text>
            <Pressable
              style={[styles.modalDeleteButton, deleting && { opacity: 0.6 }]}
              onPress={confirmDeleteAccount}
              disabled={deleting}
            >
              <Text style={styles.modalDeleteText}>
                {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.modalCancelButton}
              onPress={() => setDeleteModalVisible(false)}
              disabled={deleting}
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
  },
  backButton: {
    width: 32,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: '600',
    color: '#0F172A',
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  brandSection: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: {
    fontSize: 15,
    color: '#0F172A',
  },
  infoValue: {
    fontSize: 15,
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 16,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  navLabel: {
    fontSize: 15,
    color: '#0F172A',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 4,
  },
  socialIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  aboutText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 32,
    paddingHorizontal: 20,
  },
  copyright: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalIconRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalDeleteButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalDeleteText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  modalCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '500',
  },
});
