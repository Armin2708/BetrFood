import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { fetchPreferences, updatePreferences } from "../../../../services/api";

export default function PrivacySettings() {
  const [profileVisibility, setProfileVisibility] = useState<"public" | "private">("public");
  const [dietaryInfoVisible, setDietaryInfoVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const prefs = await fetchPreferences();
      if (prefs.profileVisibility) setProfileVisibility(prefs.profileVisibility);
      if (prefs.dietaryInfoVisible !== undefined) setDietaryInfoVisible(prefs.dietaryInfoVisible);
    } catch {
      // Use defaults on error
    } finally {
      setLoading(false);
    }
  };

  const saveField = async (updates: Parameters<typeof updatePreferences>[0]) => {
    try {
      await updatePreferences(updates);
    } catch {
      Alert.alert("Error", "Failed to save setting. Please try again.");
    }
  };

  const toggleVisibility = (value: boolean) => {
    const newVisibility = value ? "public" : "private";
    setProfileVisibility(newVisibility);
    saveField({ profileVisibility: newVisibility });
  };

  const toggleDietaryInfo = (value: boolean) => {
    setDietaryInfoVisible(value);
    saveField({ dietaryInfoVisible: value });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Public Profile</Text>
            <Text style={styles.rowDescription}>
              {profileVisibility === "public"
                ? "Anyone can see your profile"
                : "Only followers can see your profile"}
            </Text>
          </View>
          <Switch
            value={profileVisibility === "public"}
            onValueChange={toggleVisibility}
            trackColor={{ false: "#ccc", true: "#007AFF" }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Show Dietary Info</Text>
            <Text style={styles.rowDescription}>
              {dietaryInfoVisible
                ? "Your dietary preferences are visible on your profile"
                : "Your dietary preferences are hidden"}
            </Text>
          </View>
          <Switch
            value={dietaryInfoVisible}
            onValueChange={toggleDietaryInfo}
            trackColor={{ false: "#ccc", true: "#007AFF" }}
            thumbColor="#fff"
          />
        </View>
      </View>
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
  section: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowInfo: {
    flex: 1,
    marginRight: 16,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  rowDescription: {
    fontSize: 13,
    color: "#888",
    marginTop: 3,
  },
});
