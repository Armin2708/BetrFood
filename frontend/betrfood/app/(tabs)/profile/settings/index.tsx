import { useContext } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "../../../../context/AuthenticationContext";

export default function Settings() {
  const router = useRouter()
  const { logout } = useContext(AuthContext);

  // TODO
  const handleLogout = () => {

    logout()
    router.replace("/")
  }

  return (
    <View style={styles.container}>

      {/* Settings Options */}
      <View style={styles.section}>
        <Pressable style={styles.row}>
          <Ionicons name="notifications-outline" size={22} />
          <Text style={styles.rowText}>Notifications</Text>
        </Pressable>

        <Pressable style={styles.row}>
          <Ionicons name="lock-closed-outline" size={22} />
          <Text style={styles.rowText}>Privacy</Text>
        </Pressable>

        <Pressable style={styles.row}>
          <Ionicons name="help-circle-outline" size={22} />
          <Text style={styles.rowText}>Help</Text>
        </Pressable>
      </View>

      {/* Logout */}
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="white" />
        <Text style={styles.logoutText}>Log Out</Text>
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
});