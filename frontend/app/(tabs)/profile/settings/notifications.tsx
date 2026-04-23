import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useEffect, useState } from "react";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  NotificationPreferences,
} from "../../../../services/api/preferences";
import { usePreferences } from "../../../../context/PreferencesContext";

type TypeKey =
  | "expirationNotificationsEnabled"
  | "notifNewFollower"
  | "notifLikes"
  | "notifComments"
  | "notifCommentReplies"
  | "notifAiChat"
  | "notifWeeklyDigest";

const NOTIFICATION_TYPES: { key: TypeKey; title: string; description: string }[] = [
  {
    key: "notifNewFollower",
    title: "New followers",
    description: "When someone starts following you.",
  },
  {
    key: "notifLikes",
    title: "Likes",
    description: "When someone likes your post or comment.",
  },
  {
    key: "notifComments",
    title: "Comments",
    description: "When someone comments on your post.",
  },
  {
    key: "notifCommentReplies",
    title: "Comment replies",
    description: "When someone replies to your comment.",
  },
  {
    key: "expirationNotificationsEnabled",
    title: "Pantry expiration",
    description: "When pantry items are close to their expiration date.",
  },
  {
    key: "notifAiChat",
    title: "AI chat suggestions",
    description: "Proactive recipe and cooking tips from the AI assistant.",
  },
  {
    key: "notifWeeklyDigest",
    title: "Weekly digest",
    description: "A weekly recap of activity you may have missed.",
  },
];

const DEFAULT_PREFS: NotificationPreferences = {
  notificationsEnabled: true,
  expirationNotificationsEnabled: true,
  notifNewFollower: true,
  notifLikes: true,
  notifComments: true,
  notifCommentReplies: true,
  notifAiChat: true,
  notifWeeklyDigest: true,
};

export default function NotificationSettings() {
  const { preferences, loading: contextLoading } = usePreferences();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof NotificationPreferences | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const fetched = await fetchNotificationPreferences();
        if (active) setPrefs(fetched);
      } catch {
        // Fall back to context values when the dedicated endpoint fails.
        if (active && preferences) {
          setPrefs({
            notificationsEnabled: preferences.notificationsEnabled ?? true,
            expirationNotificationsEnabled:
              preferences.expirationNotificationsEnabled ?? true,
            notifNewFollower: preferences.notifNewFollower ?? true,
            notifLikes: preferences.notifLikes ?? true,
            notifComments: preferences.notifComments ?? true,
            notifCommentReplies: preferences.notifCommentReplies ?? true,
            notifAiChat: preferences.notifAiChat ?? true,
            notifWeeklyDigest: preferences.notifWeeklyDigest ?? true,
          });
        } else if (active) {
          setPrefs(DEFAULT_PREFS);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [preferences]);

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!prefs) return;
    const previous = prefs;
    setPrefs({ ...prefs, [key]: value });
    setSavingKey(key);
    try {
      const result = await updateNotificationPreferences({ [key]: value });
      setPrefs(result);
    } catch {
      setPrefs(previous);
      Alert.alert("Error", "Failed to update notification settings. Please try again.");
    } finally {
      setSavingKey(null);
    }
  };

  if (loading || contextLoading || !prefs) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const globalEnabled = prefs.notificationsEnabled;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Push Notifications</Text>
            <Text style={styles.rowDescription}>
              {globalEnabled
                ? "You'll receive in-app notifications about your activity."
                : "In-app notifications are paused. You won't receive any new alerts."}
            </Text>
          </View>
          <Switch
            value={globalEnabled}
            onValueChange={(v) => handleToggle("notificationsEnabled", v)}
            disabled={savingKey !== null}
            trackColor={{ false: "#ccc", true: "#007AFF" }}
            thumbColor="#fff"
            accessibilityLabel="Toggle global notifications"
            accessibilityRole="switch"
          />
        </View>
      </View>

      <Text style={styles.sectionHeader}>Notification types</Text>
      <Text style={styles.sectionSubtitle}>
        Choose which kinds of in-app notifications you want to receive. These
        are ignored while the master switch above is off.
      </Text>

      <View style={styles.section}>
        {NOTIFICATION_TYPES.map(({ key, title, description }, idx) => {
          const value = prefs[key] as boolean;
          const disabled = !globalEnabled || savingKey !== null;
          return (
            <View
              key={key}
              style={[
                styles.row,
                idx === NOTIFICATION_TYPES.length - 1 && styles.rowLast,
              ]}
            >
              <View style={styles.rowInfo}>
                <Text
                  style={[
                    styles.rowTitle,
                    !globalEnabled && styles.textDisabled,
                  ]}
                >
                  {title}
                </Text>
                <Text
                  style={[
                    styles.rowDescription,
                    !globalEnabled && styles.textDisabled,
                  ]}
                >
                  {description}
                </Text>
              </View>
              <Switch
                value={value}
                onValueChange={(v) => handleToggle(key, v)}
                disabled={disabled}
                trackColor={{ false: "#ccc", true: "#007AFF" }}
                thumbColor="#fff"
                accessibilityLabel={`Toggle ${title} notifications`}
                accessibilityRole="switch"
              />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
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
  textDisabled: {
    color: "#bbb",
  },
});
