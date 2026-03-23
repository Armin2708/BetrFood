import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { fetchPreferences, updatePreferences } from "../services/api";
import { Alert } from "react-native";

export interface Preferences {
  dietaryPreferences: string[];
  allergies: string[];
  cuisines: string[];
  expiringItemsThreshold: number;
  expirationNotificationsEnabled: boolean;
  profileVisibility: "public" | "private";
  dietaryInfoVisible: boolean;
}

interface PreferencesContextType {
  preferences: Preferences | null;
  loading: boolean;
  saving: boolean;
  loadPreferences: () => Promise<void>;
  updatePreferences: (updates: Partial<Preferences>) => Promise<void>;
  toggleDietaryPreference: (item: string) => void;
  toggleAllergy: (item: string) => void;
  toggleCuisine: (item: string) => void;
  setExpiringItemsThreshold: (days: number) => void;
  setExpirationNotificationsEnabled: (enabled: boolean) => void;
  setProfileVisibility: (visibility: "public" | "private") => void;
  setDietaryInfoVisible: (visible: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(
  undefined
);

const DEFAULT_PREFERENCES: Preferences = {
  dietaryPreferences: [],
  allergies: [],
  cuisines: [],
  expiringItemsThreshold: 7,
  expirationNotificationsEnabled: false,
  profileVisibility: "public",
  dietaryInfoVisible: true,
};

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferencesData();
  }, []);

  const loadPreferencesData = async () => {
    try {
      const prefs = await fetchPreferences();
      setPreferences({
        dietaryPreferences: prefs.dietaryPreferences || [],
        allergies: prefs.allergies || [],
        cuisines: prefs.cuisines || [],
        expiringItemsThreshold: prefs.expiringItemsThreshold ?? 7,
        expirationNotificationsEnabled: prefs.expirationNotificationsEnabled ?? false,
        profileVisibility: prefs.profileVisibility || "public",
        dietaryInfoVisible: prefs.dietaryInfoVisible ?? true,
      });
    } catch {
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferencesData = async (updates: Partial<Preferences>) => {
    setSaving(true);
    try {
      await updatePreferences(updates);
      setPreferences((prev) => ({
        ...prev!,
        ...updates,
      }));
      Alert.alert("Saved", "Your preferences have been updated.");
    } catch {
      Alert.alert("Error", "Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleDietaryPreference = (item: string) => {
    if (!preferences) return;
    const updated = preferences.dietaryPreferences.includes(item)
      ? preferences.dietaryPreferences.filter((i) => i !== item)
      : [...preferences.dietaryPreferences, item];
    setPreferences({
      ...preferences,
      dietaryPreferences: updated,
    });
  };

  const toggleAllergy = (item: string) => {
    if (!preferences) return;
    const updated = preferences.allergies.includes(item)
      ? preferences.allergies.filter((i) => i !== item)
      : [...preferences.allergies, item];
    setPreferences({
      ...preferences,
      allergies: updated,
    });
  };

  const toggleCuisine = (item: string) => {
    if (!preferences) return;
    const updated = preferences.cuisines.includes(item)
      ? preferences.cuisines.filter((i) => i !== item)
      : [...preferences.cuisines, item];
    setPreferences({
      ...preferences,
      cuisines: updated,
    });
  };

  const setExpiringItemsThreshold = (days: number) => {
    if (preferences) {
      setPreferences({
        ...preferences,
        expiringItemsThreshold: days,
      });
    }
  };

  const setExpirationNotificationsEnabled = (enabled: boolean) => {
    if (preferences) {
      setPreferences({
        ...preferences,
        expirationNotificationsEnabled: enabled,
      });
    }
  };

  const setProfileVisibility = (visibility: "public" | "private") => {
    if (preferences) {
      setPreferences({
        ...preferences,
        profileVisibility: visibility,
      });
    }
  };

  const setDietaryInfoVisible = (visible: boolean) => {
    if (preferences) {
      setPreferences({
        ...preferences,
        dietaryInfoVisible: visible,
      });
    }
  };

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        loading,
        saving,
        loadPreferences: loadPreferencesData,
        updatePreferences: updatePreferencesData,
        toggleDietaryPreference,
        toggleAllergy,
        toggleCuisine,
        setExpiringItemsThreshold,
        setExpirationNotificationsEnabled,
        setProfileVisibility,
        setDietaryInfoVisible,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return context;
}
