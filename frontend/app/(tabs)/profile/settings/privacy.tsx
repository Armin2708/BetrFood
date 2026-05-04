import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from "react-native";
import { usePreferences } from "../../../../context/PreferencesContext";
import { useAppTheme } from "../../../../context/ThemeContext";

export default function PrivacySettings() {
  const { colors } = useAppTheme();
  const {
    preferences,
    loading,
    updatePreferences,
  } = usePreferences();

  const toggleVisibility = async (value: boolean) => {
    const newVisibility = value ? "public" : "private";
    await updatePreferences({ profileVisibility: newVisibility });
  };

  const toggleDietaryInfo = async (value: boolean) => {
    await updatePreferences({ dietaryInfoVisible: value });
  };

  if (loading || !preferences) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.backgroundSecondary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={[styles.section, { backgroundColor: colors.backgroundElevated, borderTopColor: colors.border }]}>
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={styles.rowInfo}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Public Profile</Text>
            <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
              {preferences.profileVisibility === "public"
                ? "Anyone can see your profile"
                : "Only followers can see your profile"}
            </Text>
          </View>
          <Switch
            value={preferences.profileVisibility === "public"}
            onValueChange={toggleVisibility}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={styles.rowInfo}>
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Show Dietary Info</Text>
            <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
              {preferences.dietaryInfoVisible
                ? "Your dietary preferences are visible on your profile"
                : "Your dietary preferences are hidden"}
            </Text>
          </View>
          <Switch
            value={preferences.dietaryInfoVisible}
            onValueChange={toggleDietaryInfo}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    borderTopWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  rowInfo: {
    flex: 1,
    marginRight: 16,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  rowDescription: {
    fontSize: 13,
    marginTop: 3,
  },
});
