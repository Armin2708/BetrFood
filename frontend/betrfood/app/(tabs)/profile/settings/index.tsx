import { useContext, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../../../context/AuthenticationContext";
import { deleteAccount } from "../../../../services/api";

export default function Settings() {
  const router = useRouter();
  const { user, token, logout } = useContext(AuthContext) as any;

  const [showReauthModal, setShowReauthModal] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  // ── Step 1: Initial confirmation alert ───────────────────────────────────

  const handleDeleteAccountPress = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, all your posts, follows, and data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            // Step 2: Second confirmation
            Alert.alert(
              'Are you absolutely sure?',
              'Your account will be gone forever. There is no way to recover it.',
              [
                { text: 'Go Back', style: 'cancel' },
                {
                  text: 'Delete My Account',
                  style: 'destructive',
                  onPress: () => {
                    // Step 3: Open re-auth modal
                    setPassword('');
                    setPasswordError('');
                    setShowReauthModal(true);
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  // ── Step 3: Re-authenticate and delete ───────────────────────────────────

  const handleConfirmDelete = async () => {
    if (!password.trim()) {
      setPasswordError('Please enter your password.');
      return;
    }
    setPasswordError('');
    setDeleting(true);
    try {
      await deleteAccount(token, password);
      setShowReauthModal(false);
      await logout();
      router.replace('/');
    } catch (e: any) {
      if (e.message?.toLowerCase().includes('password')) {
        setPasswordError('Incorrect password. Please try again.');
      } else {
        Alert.alert('Error', e.message || 'Failed to delete account.');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.container}>

      <View style={styles.section}>

        <Pressable style={styles.row} onPress={() => router.push('/profile/info/preferences')}>
          <Ionicons name="restaurant-outline" size={22} color="#FF6B35" />
          <Text style={styles.rowText}>Cooking Preferences</Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" style={styles.chevron} />
        </Pressable>

        <Pressable style={styles.row}>
          <Ionicons name="notifications-outline" size={22} />
          <Text style={styles.rowText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" style={styles.chevron} />
        </Pressable>

        <Pressable style={styles.row}>
          <Ionicons name="lock-closed-outline" size={22} />
          <Text style={styles.rowText}>Privacy</Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" style={styles.chevron} />
        </Pressable>

        <Pressable style={styles.row}>
          <Ionicons name="help-circle-outline" size={22} />
          <Text style={styles.rowText}>Help</Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" style={styles.chevron} />
        </Pressable>

      </View>

      {/* Log out */}
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="white" />
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>

      {/* Delete account */}
      <Pressable style={styles.deleteButton} onPress={handleDeleteAccountPress}>
        <Ionicons name="trash-outline" size={22} color="#ff3b30" />
        <Text style={styles.deleteText}>Delete Account</Text>
      </Pressable>

      {/* Re-authentication modal */}
      <Modal
        visible={showReauthModal}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setShowReauthModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning-outline" size={28} color="#ff3b30" />
              <Text style={styles.modalTitle}>Confirm Deletion</Text>
            </View>
            <Text style={styles.modalBody}>
              Enter your password to permanently delete your account. This action cannot be undone.
            </Text>

            <TextInput
              style={[styles.passwordInput, passwordError ? styles.passwordInputError : null]}
              placeholder="Enter your password"
              placeholderTextColor="#bbb"
              secureTextEntry
              value={password}
              onChangeText={(t) => { setPassword(t); setPasswordError(''); }}
              autoFocus
              editable={!deleting}
            />
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelModalBtn}
                onPress={() => setShowReauthModal(false)}
                disabled={deleting}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.confirmDeleteBtn, deleting && styles.confirmDeleteBtnDisabled]}
                onPress={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Delete Forever</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowText: {
    fontSize: 16,
    flex: 1,
  },
  chevron: {
    marginLeft: 'auto',
  },
  logoutButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ff3b30",
    padding: 14,
    borderRadius: 10,
    marginTop: 40,
    gap: 8,
  },
  logoutText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  deleteButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#ff3b30",
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  deleteText: {
    color: "#ff3b30",
    fontWeight: "600",
    fontSize: 16,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  modalBody: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
    marginBottom: 6,
  },
  passwordInputError: {
    borderColor: '#ff3b30',
  },
  errorText: {
    fontSize: 12,
    color: '#ff3b30',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelModalText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 8,
    backgroundColor: '#ff3b30',
    alignItems: 'center',
  },
  confirmDeleteBtnDisabled: {
    opacity: 0.5,
  },
  confirmDeleteText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
