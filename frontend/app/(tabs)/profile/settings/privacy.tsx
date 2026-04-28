import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from "react-native";
import { usePreferences } from "../../../../context/PreferencesContext";
import { useScaledTypography } from "../../../../hooks/useScaledTypography";

export default function PrivacySettings() {
  const {
    preferences,
    loading,
    updatePreferences,
  } = usePreferences();
  const scaledTypography = useScaledTypography();

  const toggleVisibility = async (value: boolean) => {
    const newVisibility = value ? "public" : "private";
    await updatePreferences({ profileVisibility: newVisibility });
  };

  const toggleDietaryInfo = async (value: boolean) => {
    await updatePreferences({ dietaryInfoVisible: value });
  };

  if (loading || !preferences) {
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
              {preferences.profileVisibility === "public"
                ? "Anyone can see your profile"
                : "Only followers can see your profile"}
            </Text>
          </View>
          <Switch
            value={preferences.profileVisibility === "public"}
            onValueChange={toggleVisibility}
            trackColor={{ false: "#ccc", true: "#007AFF" }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Show Dietary Info</Text>
            <Text style={styles.rowDescription}>
              {preferences.dietaryInfoVisible
                ? "Your dietary preferences are visible on your profile"
                : "Your dietary preferences are hidden"}
            </Text>
          </View>
          <Switch
            value={preferences.dietaryInfoVisible}
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
