import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { usePreferences } from "../../../../context/PreferencesContext";
import { useScaledTypography } from "../../../../hooks/useScaledTypography";
import { PantryVisibility } from "../../../../services/api/preferences";

const PANTRY_OPTIONS: { value: PantryVisibility; label: string; description: string }[] = [
  {
    value: 'only_me',
    label: 'Only me',
    description: 'Your pantry is completely private.',
  },
  {
    value: 'followers',
    label: 'Followers',
    description: 'People you follow back can see your pantry.',
  },
  {
    value: 'everyone',
    label: 'Everyone',
    description: 'Anyone can see your pantry.',
  },
];

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

  const setPantryVisibility = async (value: PantryVisibility) => {
    await updatePreferences({ pantryVisibility: value });
  };

  if (loading || !preferences) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const currentPantryVisibility: PantryVisibility =
    (preferences as any).pantryVisibility || 'only_me';

  return (
    <View style={styles.container}>
      <View style={styles.section}>

        {/* Profile visibility */}
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

        {/* Dietary info visibility */}
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

      {/* Pantry visibility */}
      <Text style={styles.sectionHeader}>Pantry Visibility</Text>
      <Text style={styles.sectionSubtitle}>
        Choose who can see the items in your pantry. Defaults to only you.
      </Text>

      <View style={styles.section}>
        {PANTRY_OPTIONS.map(({ value, label, description }, idx) => {
          const isSelected = currentPantryVisibility === value;
          return (
            <TouchableOpacity
              key={value}
              style={[
                styles.optionRow,
                idx === PANTRY_OPTIONS.length - 1 && styles.rowLast,
              ]}
              onPress={() => setPantryVisibility(value)}
              activeOpacity={0.7}
            >
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>{label}</Text>
                <Text style={styles.rowDescription}>{description}</Text>
              </View>
              <View style={[
                styles.radioOuter,
                isSelected && styles.radioOuterSelected,
              ]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        })}
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
  sectionHeader: {
    marginTop: 28,
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sectionSubtitle: {
    marginTop: 6,
    marginBottom: 8,
    fontSize: 13,
    color: "#888",
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowLast: {
    borderBottomWidth: 0,
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
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: "#007AFF",
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: "#007AFF",
  },
});
