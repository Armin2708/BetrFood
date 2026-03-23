import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Switch,
} from "react-native";
import { colors } from "../../../../constants/theme"
import { usePreferences } from "../../../../context/PreferencesContext";
import {
  requestNotificationPermission,
  cancelAllExpiryNotifications,
  scheduleExpiryNotifications,
} from "../../../../utils/pantryNotifications";
import { fetchPantryItems } from "../../../../services/api";

const DIETARY_OPTIONS = [
  "Vegan",
  "Vegetarian",
  "Gluten-Free",
  "Keto",
  "Paleo",
  "Dairy-Free",
  "Nut-Free",
  "Low-Carb",
];

const ALLERGY_OPTIONS = [
  "Peanuts",
  "Tree Nuts",
  "Milk",
  "Eggs",
  "Fish",
  "Shellfish",
  "Wheat",
  "Soy",
  "Sesame",
];

const CUISINE_OPTIONS = [
  "American",
  "Chinese",
  "French",
  "Indian",
  "Italian",
  "Japanese",
  "Korean",
  "Mediterranean",
  "Mexican",
  "Thai",
];

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{label}</Text>
      <View style={styles.chipContainer}>
        {options.map((item) => {
          const active = selected.includes(item);
          return (
            <Pressable
              key={item}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onToggle(item)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function FoodPreferences() {
  const {
    preferences,
    loading,
    saving,
    updatePreferences,
    toggleDietaryPreference,
    toggleAllergy,
    toggleCuisine,
    setExpiringItemsThreshold,
    setExpirationNotificationsEnabled,
  } = usePreferences();

  // Handle the notification toggle — request permissions when enabling,
  // cancel all notifications when disabling.
  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        return;
      }
      setExpirationNotificationsEnabled(value);
    } else {
      await cancelAllExpiryNotifications();
      setExpirationNotificationsEnabled(value);
    }
    await updatePreferences({
      expirationNotificationsEnabled: value,
    });
  };

  // When threshold changes, reschedule all existing notifications
  const handleThresholdChange = async (days: number) => {
    setExpiringItemsThreshold(days);
    if (preferences?.expirationNotificationsEnabled) {
      try {
        const items = await fetchPantryItems();
        await scheduleExpiryNotifications(items, true, days);
      } catch {
        // Non-critical — notifications will reschedule on next app load
      }
    }
    await updatePreferences({
      expiringItemsThreshold: days,
    });
  };

  const handleSave = async () => {
    if (!preferences) return;
    await updatePreferences({
      dietaryPreferences: preferences.dietaryPreferences,
      allergies: preferences.allergies,
      cuisines: preferences.cuisines,
      expiringItemsThreshold: preferences.expiringItemsThreshold,
      expirationNotificationsEnabled: preferences.expirationNotificationsEnabled,
    });
  };

  if (loading || !preferences) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ChipGroup
        label="Dietary Preferences"
        options={DIETARY_OPTIONS}
        selected={preferences.dietaryPreferences}
        onToggle={toggleDietaryPreference}
      />

      <ChipGroup
        label="Food Allergies"
        options={ALLERGY_OPTIONS}
        selected={preferences.allergies}
        onToggle={toggleAllergy}
      />

      <ChipGroup
        label="Favorite Cuisines"
        options={CUISINE_OPTIONS}
        selected={preferences.cuisines}
        onToggle={toggleCuisine}
      />

      {/* ── Pantry Preferences ─────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pantry Preferences</Text>

        {/* Notification toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextGroup}>
            <Text style={styles.toggleLabel}>Expiration Notifications</Text>
            <Text style={styles.toggleSubLabel}>
              Get reminded when items are about to expire
            </Text>
          </View>
          <Switch
            value={preferences.expirationNotificationsEnabled}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: '#ddd', true: colors.primary }}
            thumbColor="#fff"
            accessibilityLabel="Enable expiration notifications"
            accessibilityRole="switch"
          />
        </View>

        {/* Threshold picker — only shown when notifications are enabled */}
        {preferences.expirationNotificationsEnabled && (
          <View style={styles.thresholdSection}>
            <Text style={styles.settingLabel}>
              Notify me when items expire within:{' '}
              <Text style={styles.settingValue}>{preferences.expiringItemsThreshold} days</Text>
            </Text>
            <View style={styles.sliderButtonContainer}>
              {[3, 7, 14, 30].map((days) => (
                <Pressable
                  key={days}
                  style={[
                    styles.thresholdButton,
                    preferences.expiringItemsThreshold === days && styles.thresholdButtonActive,
                  ]}
                  onPress={() => handleThresholdChange(days)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: preferences.expiringItemsThreshold === days }}
                  accessibilityLabel={`Notify ${days} days before expiry`}
                >
                  <Text
                    style={[
                      styles.thresholdButtonText,
                      preferences.expiringItemsThreshold === days && styles.thresholdButtonTextActive,
                    ]}
                  >
                    {days}d
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      <Pressable
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.saveButtonText}>Save Preferences</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f5f5f5",
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  chipText: {
    fontSize: 14,
    color: "#333",
  },
  chipTextActive: {
    color: "white",
    fontWeight: "500",
  },
  // Notification toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 12,
  },
  toggleTextGroup: {
    flex: 1,
    paddingRight: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  toggleSubLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  // Threshold section (visible when notifications are on)
  thresholdSection: {
    paddingHorizontal: 2,
  },
  settingLabel: {
    fontSize: 14,
    color: "#333",
    marginBottom: 12,
  },
  settingValue: {
    fontWeight: "600",
    color: colors.primary,
  },
  sliderButtonContainer: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  thresholdButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  thresholdButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  thresholdButtonText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  thresholdButtonTextActive: {
    color: "white",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
