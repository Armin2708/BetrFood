import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useScaledTypography } from "../../../../hooks/useScaledTypography";
import { useAppTheme } from "../../../../context/ThemeContext";
import {
  fetchBlockedUsers,
  fetchMutedUsers,
  unblockUser,
  unmuteUser,
} from "../../../../services/api";

interface BlockedMutedUser {
  userId: string;
  username: string | null;
  displayName: string | null;
}

export default function BlockedMutedScreen() {
  const [blockedUsers, setBlockedUsers] = useState<BlockedMutedUser[]>([]);
  const [mutedUsers, setMutedUsers] = useState<BlockedMutedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useAppTheme();
  const scaledTypography = useScaledTypography();

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const [blocked, muted] = await Promise.all([
        fetchBlockedUsers(),
        fetchMutedUsers(),
      ]);
      setBlockedUsers(blocked);
      setMutedUsers(muted);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load blocked/muted users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleUnblock = async (userId: string) => {
    try {
      await unblockUser(userId);
      setBlockedUsers((prev) => prev.filter((u) => u.userId !== userId));
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to unblock user.");
    }
  };

  const handleUnmute = async (userId: string) => {
    try {
      await unmuteUser(userId);
      setMutedUsers((prev) => prev.filter((u) => u.userId !== userId));
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to unmute user.");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[scaledTypography.title, { color: colors.textPrimary }]}>Blocked Users</Text>
      {blockedUsers.length === 0 ? (
        <Text style={[scaledTypography.body, { color: colors.textTertiary }]}>No blocked users</Text>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.userId}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.userRow}>
              <View style={styles.userInfo}>
                <Text style={[scaledTypography.body, { color: colors.textPrimary }]}>
                  {item.displayName || item.username || "Unknown User"}
                </Text>
                {item.username && (
                  <Text style={[scaledTypography.small, { color: colors.textTertiary }]}>@{item.username}</Text>
                )}
              </View>
              <Pressable
                style={styles.actionButton}
                onPress={() => handleUnblock(item.userId)}
              >
                <Text style={[scaledTypography.label, { color: "#fff" }]}>Unblock</Text>
              </Pressable>
            </View>
          )}
        />
      )}

      <View style={styles.divider} />

      <Text style={[scaledTypography.title, { color: colors.textPrimary }]}>Muted Users</Text>
      {mutedUsers.length === 0 ? (
        <Text style={[scaledTypography.body, { color: colors.textTertiary }]}>No muted users</Text>
      ) : (
        <FlatList
          data={mutedUsers}
          keyExtractor={(item) => item.userId}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.userRow}>
              <View style={styles.userInfo}>
                <Text style={[scaledTypography.body, { color: colors.textPrimary }]}>
                  {item.displayName || item.username || "Unknown User"}
                </Text>
                {item.username && (
                  <Text style={[scaledTypography.small, { color: colors.textTertiary }]}>@{item.username}</Text>
                )}
              </View>
              <Pressable
                style={[styles.actionButton, styles.unmuteButton]}
                onPress={() => handleUnmute(item.userId)}
              >
                <Text style={[scaledTypography.label, styles.unmuteButtonText]}>Unmute</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 20,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  userInfo: {
    flex: 1,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#ff3b30",
  },
  unmuteButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  unmuteButtonText: {
    color: "#333",
  },
});
