import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "../../../../services/api";
import { usePreferences } from "../../../../context/PreferencesContext";

export default function NotificationSettings() {
  const { preferences, loading: contextLoading } = usePreferences();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { notificationsEnabled } = await fetchNotificationPreferences();
        if (active) setEnabled(notificationsEnabled);
      } catch {
        // Fall back to context value when the dedicated endpoint fails
        if (active && preferences) {
          setEnabled(preferences.notificationsEnabled ?? true);
        } else if (active) {
          setEnabled(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [preferences]);

  const handleToggle = async (value: boolean) => {
    const previous = enabled;
    setEnabled(value);
    setSaving(true);
    try {
      const result = await updateNotificationPreferences({
        notificationsEnabled: value,
      });
      setEnabled(result.notificationsEnabled);
    } catch {
      setEnabled(previous);
      Alert.alert("Error", "Failed to update notification settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || contextLoading || enabled === null) {
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
            <Text style={styles.rowTitle}>Push Notifications</Text>
            <Text style={styles.rowDescription}>
              {enabled
                ? "You'll receive in-app notifications about your activity."
                : "In-app notifications are paused. You won't receive any new alerts."}
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            disabled={saving}
            trackColor={{ false: "#ccc", true: "#007AFF" }}
            thumbColor="#fff"
            accessibilityLabel="Toggle global notifications"
            accessibilityRole="switch"
          />
        </View>
      </View>

      <Text style={styles.footnote}>
        This is a master switch for all in-app notifications. Individual
        notification types can be configured separately when those controls are
        added.
      </Text>
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
  footnote: {
    marginTop: 20,
    fontSize: 12,
    color: "#888",
    lineHeight: 18,
  },
});
