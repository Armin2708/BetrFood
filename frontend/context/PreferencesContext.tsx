import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { fetchPreferences, updatePreferences } from "../services/api";
import { Alert } from "react-native";
import { AuthContext } from "./AuthenticationContext";
import { TextSizeScale } from "../utils/textSizeScaling";

export interface Preferences {
  dietaryPreferences: string[];
  allergies: string[];
  cuisines: string[];
  expiringItemsThreshold: number;
  expirationNotificationsEnabled: boolean;
  notificationsEnabled: boolean;
  notifNewFollower: boolean;
  notifLikes: boolean;
  notifComments: boolean;
  notifCommentReplies: boolean;
  notifAiChat: boolean;
  notifWeeklyDigest: boolean;
  profileVisibility: "public" | "private";
  dietaryInfoVisible: boolean;
  textSizeScale: TextSizeScale;
}

interface PreferencesContextType {
  preferences: Preferences | null;
  loading: boolean;
  saving: boolean;
  loadPreferences: () => Promise<void>;
  updatePreferences: (updates: Partial<Preferences>) => Promise<void>;
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
  notificationsEnabled: true,
  notifNewFollower: true,
  notifLikes: true,
  notifComments: true,
  notifCommentReplies: true,
  notifAiChat: true,
  notifWeeklyDigest: true,
  profileVisibility: "public",
  dietaryInfoVisible: true,
  textSizeScale: "default",
};

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { token, loading: authLoading } = useContext(AuthContext);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || !token) return;
    loadPreferencesData();
  }, [authLoading, token]);

  const loadPreferencesData = async () => {
    try {
      const prefs = await fetchPreferences();
      setPreferences({
        dietaryPreferences: prefs.dietaryPreferences || [],
        allergies: prefs.allergies || [],
        cuisines: prefs.cuisines || [],
        expiringItemsThreshold: prefs.expiringItemsThreshold ?? 7,
        expirationNotificationsEnabled: prefs.expirationNotificationsEnabled ?? false,
        notificationsEnabled: prefs.notificationsEnabled ?? true,
        notifNewFollower: prefs.notifNewFollower ?? true,
        notifLikes: prefs.notifLikes ?? true,
        notifComments: prefs.notifComments ?? true,
        notifCommentReplies: prefs.notifCommentReplies ?? true,
        notifAiChat: prefs.notifAiChat ?? true,
        notifWeeklyDigest: prefs.notifWeeklyDigest ?? true,
        profileVisibility: prefs.profileVisibility || "public",
        dietaryInfoVisible: prefs.dietaryInfoVisible ?? true,
        textSizeScale: (prefs.textSizeScale as TextSizeScale) || "default",
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
      const updatedPrefs = await updatePreferences(updates);
      // Update context with the response from the server
      setPreferences((prev) => ({
        ...prev!,
        ...updatedPrefs,
      }));
      Alert.alert("Saved", "Your preferences have been updated.");
    } catch {
      Alert.alert("Error", "Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
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
