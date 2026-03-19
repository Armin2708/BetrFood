import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { fetchPreferences, updatePreferences } from "../../../../services/api";
import {
  requestNotificationPermission,
  cancelAllExpiryNotifications,
  scheduleExpiryNotifications,
  cancelExpiryNotification,
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
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [expiringItemsThreshold, setExpiringItemsThreshold] = useState(7);
  const [expirationNotificationsEnabled, setExpirationNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await fetchPreferences();
      setDietaryPreferences(prefs.dietaryPreferences || []);
      setAllergies(prefs.allergies || []);
      setCuisines(prefs.cuisines || []);
      setExpiringItemsThreshold(prefs.expiringItemsThreshold || 7);
      setExpirationNotificationsEnabled(prefs.expirationNotificationsEnabled ?? false);
    } catch {
      // Start with empty selections if fetch fails
    } finally {
      setLoading(false);
    }
  };

  const toggle = (
    list: string[],
    setList: (v: string[]) => void,
    item: string
  ) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  // Handle the notification toggle — request permissions when enabling,
  // cancel all notifications when disabling.
  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications for BetrFood in your device settings to receive expiration reminders.'
        );
        return;
      }
    } else {
      await cancelAllExpiryNotifications();
    }
    setExpirationNotificationsEnabled(value);
  };

  // When threshold changes, reschedule all existing notifications
  const handleThresholdChange = async (days: number) => {
    setExpiringItemsThreshold(days);
    if (expirationNotificationsEnabled) {
      try {
        const items = await fetchPantryItems();
        await scheduleExpiryNotifications(items, true, days);
      } catch {
        // Non-critical — notifications will reschedule on next app load
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePreferences({
        dietaryPreferences,
        allergies,
        cuisines,
        expiringItemsThreshold,
        expirationNotificationsEnabled,
      });
      Alert.alert("Saved", "Your preferences have been updated.");
    } catch {
      Alert.alert("Error", "Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
        selected={dietaryPreferences}
        onToggle={(item) => toggle(dietaryPreferences, setDietaryPreferences, item)}
      />

      <ChipGroup
        label="Food Allergies"
        options={ALLERGY_OPTIONS}
        selected={allergies}
        onToggle={(item) => toggle(allergies, setAllergies, item)}
      />

      <ChipGroup
        label="Favorite Cuisines"
        options={CUISINE_OPTIONS}
        selected={cuisines}
        onToggle={(item) => toggle(cuisines, setCuisines, item)}
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
            value={expirationNotificationsEnabled}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: '#ddd', true: '#007AFF' }}
            thumbColor="#fff"
            accessibilityLabel="Enable expiration notifications"
            accessibilityRole="switch"
          />
        </View>

        {/* Threshold picker — only shown when notifications are enabled */}
        {expirationNotificationsEnabled && (
          <View style={styles.thresholdSection}>
            <Text style={styles.settingLabel}>
              Notify me when items expire within:{' '}
              <Text style={styles.settingValue}>{expiringItemsThreshold} days</Text>
            </Text>
            <View style={styles.sliderButtonContainer}>
              {[3, 7, 14, 30].map((days) => (
                <Pressable
                  key={days}
                  style={[
                    styles.thresholdButton,
                    expiringItemsThreshold === days && styles.thresholdButtonActive,
                  ]}
                  onPress={() => handleThresholdChange(days)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: expiringItemsThreshold === days }}
                  accessibilityLabel={`Notify ${days} days before expiry`}
                >
                  <Text
                    style={[
                      styles.thresholdButtonText,
                      expiringItemsThreshold === days && styles.thresholdButtonTextActive,
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
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
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
    color: "#007AFF",
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
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
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
    backgroundColor: "#007AFF",
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
