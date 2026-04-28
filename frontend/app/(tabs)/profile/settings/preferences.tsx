import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { colors } from "../../../../constants/theme"
import { usePreferences, Preferences } from "../../../../context/PreferencesContext";
import { useScaledTypography } from "../../../../hooks/useScaledTypography";
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
    preferences: contextPreferences,
    loading,
    saving,
    updatePreferences,
  } = usePreferences();
  const scaledTypography = useScaledTypography();

  // Local state for editing - separate from global context
  const [localPreferences, setLocalPreferences] = useState<Preferences | null>(null);

  // Initialize local state from context preferences when they load or change
  useEffect(() => {
    if (contextPreferences) {
      setLocalPreferences({ ...contextPreferences });
    }
  }, [contextPreferences]);

  // Reset local state to database values when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (contextPreferences) {
        setLocalPreferences({ ...contextPreferences });
      }
    }, [contextPreferences])
  );

  // Local toggle handlers
  const toggleDietaryPreference = (item: string) => {
    if (!localPreferences) return;
    const updated = localPreferences.dietaryPreferences.includes(item)
      ? localPreferences.dietaryPreferences.filter((i) => i !== item)
      : [...localPreferences.dietaryPreferences, item];
    setLocalPreferences({
      ...localPreferences,
      dietaryPreferences: updated,
    });
  };

  const toggleAllergy = (item: string) => {
    if (!localPreferences) return;
    const updated = localPreferences.allergies.includes(item)
      ? localPreferences.allergies.filter((i) => i !== item)
      : [...localPreferences.allergies, item];
    setLocalPreferences({
      ...localPreferences,
      allergies: updated,
    });
  };

  const toggleCuisine = (item: string) => {
    if (!localPreferences) return;
    const updated = localPreferences.cuisines.includes(item)
      ? localPreferences.cuisines.filter((i) => i !== item)
      : [...localPreferences.cuisines, item];
    setLocalPreferences({
      ...localPreferences,
      cuisines: updated,
    });
  };

  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        return;
      }
    }
    if (localPreferences) {
      setLocalPreferences({
        ...localPreferences,
        expirationNotificationsEnabled: value,
      });
    }
  };

  const handleThresholdChange = (days: number) => {
    if (localPreferences) {
      setLocalPreferences({
        ...localPreferences,
        expiringItemsThreshold: days,
      });
    }
  };

  const handleSave = async () => {
    if (!localPreferences) return;
    
    // Handle notification-specific actions before saving
    if (localPreferences.expirationNotificationsEnabled) {
      // Reschedule notifications with the new threshold
      try {
        const items = await fetchPantryItems();
        await scheduleExpiryNotifications(items, true, localPreferences.expiringItemsThreshold);
      } catch {
        // Non-critical — notifications will reschedule on next app load
      }
    } else {
      // Cancel all notifications if disabled
      await cancelAllExpiryNotifications();
    }
    
    // Save all preferences at once - this will update the context
    await updatePreferences({
      dietaryPreferences: localPreferences.dietaryPreferences,
      allergies: localPreferences.allergies,
      cuisines: localPreferences.cuisines,
      expiringItemsThreshold: localPreferences.expiringItemsThreshold,
      expirationNotificationsEnabled: localPreferences.expirationNotificationsEnabled,
    });
  };

  if (loading || !localPreferences) {
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
        selected={localPreferences.dietaryPreferences}
        onToggle={toggleDietaryPreference}
      />

      <ChipGroup
        label="Food Allergies"
        options={ALLERGY_OPTIONS}
        selected={localPreferences.allergies}
        onToggle={toggleAllergy}
      />

      <ChipGroup
        label="Favorite Cuisines"
        options={CUISINE_OPTIONS}
        selected={localPreferences.cuisines}
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
            value={localPreferences.expirationNotificationsEnabled}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: '#ddd', true: colors.primary }}
            thumbColor="#fff"
            accessibilityLabel="Enable expiration notifications"
            accessibilityRole="switch"
          />
        </View>

        {/* Threshold picker — only shown when notifications are enabled */}
        {localPreferences.expirationNotificationsEnabled && (
          <View style={styles.thresholdSection}>
            <Text style={styles.settingLabel}>
              Notify me when items expire within:{' '}
              <Text style={styles.settingValue}>{localPreferences.expiringItemsThreshold} days</Text>
            </Text>
            <View style={styles.sliderButtonContainer}>
              {[3, 7, 14, 30].map((days) => (
                <Pressable
                  key={days}
                  style={[
                    styles.thresholdButton,
                    localPreferences.expiringItemsThreshold === days && styles.thresholdButtonActive,
                  ]}
                  onPress={() => handleThresholdChange(days)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: localPreferences.expiringItemsThreshold === days }}
                  accessibilityLabel={`Notify ${days} days before expiry`}
                >
                  <Text
                    style={[
                      styles.thresholdButtonText,
                      localPreferences.expiringItemsThreshold === days && styles.thresholdButtonTextActive,
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
