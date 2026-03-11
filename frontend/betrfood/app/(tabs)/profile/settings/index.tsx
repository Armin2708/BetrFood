import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useClerk } from "@clerk/clerk-expo";
import { useContext } from "react";
import { AuthContext } from "../../../../context/AuthenticationContext";
import { deleteAccount } from "../../../../services/api";

export default function Settings() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useContext(AuthContext);

  const isAdminOrMod = user?.role === 'admin' || user?.role === 'moderator';

  const handleLogout = async () => {
    await signOut();
    router.replace("/");
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
              await signOut();
              router.replace("/");
            } catch {
              Alert.alert("Error", "Failed to delete account. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Settings Options */}
      <View style={styles.section}>
        <Pressable
          style={styles.row}
          onPress={() => router.push("/profile/settings/preferences" as any)}
        >
          <Ionicons name="restaurant-outline" size={22} />
          <Text style={styles.rowText}>Food Preferences</Text>
        </Pressable>

        <Pressable style={styles.row}>
          <Ionicons name="notifications-outline" size={22} />
          <Text style={styles.rowText}>Notifications</Text>
        </Pressable>

        <Pressable
          style={styles.row}
          onPress={() => router.push("/profile/settings/privacy" as any)}
        >
          <Ionicons name="lock-closed-outline" size={22} />
          <Text style={styles.rowText}>Privacy</Text>
        </Pressable>

        <Pressable
          style={styles.row}
          onPress={() => router.push("/profile/settings/blocked" as any)}
        >
          <Ionicons name="ban-outline" size={22} />
          <Text style={styles.rowText}>Blocked & Muted</Text>
        </Pressable>

        <Pressable style={styles.row}>
          <Ionicons name="help-circle-outline" size={22} />
          <Text style={styles.rowText}>Help</Text>
        </Pressable>

        {isAdminOrMod && (
          <Pressable style={styles.row} onPress={() => router.push('/admin' as any)}>
            <Ionicons name="shield-outline" size={22} color="#FF6B35" />
            <Text style={[styles.rowText, styles.adminText]}>Admin Panel</Text>
          </Pressable>
        )}
      </View>

      {/* Logout */}
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="white" />
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>

      {/* Delete Account */}
      <Pressable style={styles.deleteButton} onPress={handleDeleteAccount}>
        <Ionicons name="trash-outline" size={22} color="#ff3b30" />
        <Text style={styles.deleteText}>Delete Account</Text>
      </Pressable>
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
  },

  adminText: {
    color: "#FF6B35",
    fontWeight: "600",
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
    borderWidth: 1,
    borderColor: "#ff3b30",
    backgroundColor: "#fff",
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
});
