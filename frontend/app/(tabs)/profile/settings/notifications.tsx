import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  Platform,
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
  { key: "notifNewFollower", title: "New followers", description: "When someone starts following you." },
  { key: "notifLikes", title: "Likes", description: "When someone likes your post or comment." },
  { key: "notifComments", title: "Comments", description: "When someone comments on your post." },
  { key: "notifCommentReplies", title: "Comment replies", description: "When someone replies to your comment." },
  { key: "expirationNotificationsEnabled", title: "Pantry expiration", description: "When pantry items are close to their expiration date." },
  { key: "notifAiChat", title: "AI chat suggestions", description: "Proactive recipe and cooking tips from the AI assistant." },
  { key: "notifWeeklyDigest", title: "Weekly digest", description: "A weekly recap of activity you may have missed." },
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
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  quietHoursTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

// ── Time picker helpers ───────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${m} ${ampm}`;
}

function nextQuarterHour(time: string, direction: 'up' | 'down'): string {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m;
  const step = 15;
  let newTotal = direction === 'up'
    ? totalMinutes + step
    : totalMinutes - step;
  if (newTotal < 0) newTotal += 24 * 60;
  if (newTotal >= 24 * 60) newTotal -= 24 * 60;
  const newH = Math.floor(newTotal / 60);
  const newM = newTotal % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function TimeSelector({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  disabled: boolean;
}) {
  return (
    <View style={timeSelectorStyles.container}>
      <Text style={[timeSelectorStyles.label, disabled && timeSelectorStyles.textDisabled]}>
        {label}
      </Text>
      <View style={timeSelectorStyles.controls}>
        <TouchableOpacity
          onPress={() => onChange(nextQuarterHour(value, 'down'))}
          disabled={disabled}
          style={[timeSelectorStyles.button, disabled && timeSelectorStyles.buttonDisabled]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={timeSelectorStyles.buttonText}>−</Text>
        </TouchableOpacity>
        <Text style={[timeSelectorStyles.timeText, disabled && timeSelectorStyles.textDisabled]}>
          {formatTime(value)}
        </Text>
        <TouchableOpacity
          onPress={() => onChange(nextQuarterHour(value, 'up'))}
          disabled={disabled}
          style={[timeSelectorStyles.button, disabled && timeSelectorStyles.buttonDisabled]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={timeSelectorStyles.buttonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const timeSelectorStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  label: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  textDisabled: { color: '#bbb' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: '600', lineHeight: 24 },
  timeText: { fontSize: 15, fontWeight: '600', color: '#000', minWidth: 80, textAlign: 'center' },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function NotificationSettings() {
  const { preferences, loading: contextLoading } = usePreferences();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const fetched = await fetchNotificationPreferences();
        if (active) setPrefs({
          ...DEFAULT_PREFS,
          ...fetched,
          // Ensure timezone defaults to device timezone if not set
          quietHoursTimezone: fetched.quietHoursTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      } catch {
        if (active && preferences) {
          setPrefs({
            ...DEFAULT_PREFS,
            notificationsEnabled: preferences.notificationsEnabled ?? true,
            expirationNotificationsEnabled: preferences.expirationNotificationsEnabled ?? true,
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
    return () => { active = false; };
  }, [preferences]);

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!prefs) return;
    const previous = prefs;
    // Optimistically update local state immediately
    const optimistic = { ...prefs, [key]: value };
    setPrefs(optimistic);
    setSavingKey(key);
    try {
      const result = await updateNotificationPreferences({ [key]: value });
      // Merge result with optimistic state — keep local values for any
      // fields the server didn't return (e.g. quiet hours times)
      setPrefs(prev => ({ ...DEFAULT_PREFS, ...prev, ...result }));
    } catch {
      setPrefs(previous);
      Alert.alert("Error", "Failed to update notification settings. Please try again.");
    } finally {
      setSavingKey(null);
    }
  };

  const handleTimeChange = async (key: 'quietHoursStart' | 'quietHoursEnd', value: string) => {
    if (!prefs) return;
    const previous = prefs;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setSavingKey(key);
    try {
      await updateNotificationPreferences({ [key]: value });
    } catch {
      setPrefs(previous);
      Alert.alert("Error", "Failed to update quiet hours. Please try again.");
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
  const quietEnabled = prefs.quietHoursEnabled;
  const isSaving = savingKey !== null;

  // Format the quiet hours summary for the subtitle
  const quietSummary = quietEnabled
    ? `${formatTime(prefs.quietHoursStart)} – ${formatTime(prefs.quietHoursEnd)}`
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Global toggle */}
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
            disabled={isSaving}
            trackColor={{ false: "#ccc", true: "#007AFF" }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Quiet hours */}
      <Text style={styles.sectionHeader}>Quiet Hours</Text>
      <Text style={styles.sectionSubtitle}>
        Suppress notifications during a set time window. Notifications are held and delivered after quiet hours end.
        {quietEnabled && quietSummary ? ` Currently set to ${quietSummary}.` : ''}
      </Text>

      <View style={styles.section}>
        {/* Quiet hours enable toggle */}
        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={[styles.rowTitle, !globalEnabled && styles.textDisabled]}>
              Enable Quiet Hours
            </Text>
            <Text style={[styles.rowDescription, !globalEnabled && styles.textDisabled]}>
              {quietEnabled
                ? `Notifications suppressed ${formatTime(prefs.quietHoursStart)} – ${formatTime(prefs.quietHoursEnd)}`
                : 'Set a time window to silence notifications.'}
            </Text>
          </View>
          <Switch
            value={quietEnabled}
            onValueChange={(v) => handleToggle("quietHoursEnabled", v)}
            disabled={!globalEnabled || isSaving}
            trackColor={{ false: "#ccc", true: "#007AFF" }}
            thumbColor="#fff"
          />
        </View>

        {/* Time pickers — only visible when quiet hours enabled */}
        {quietEnabled && (
          <>
            <View style={styles.timeDivider} />
            <View style={styles.timePickerContainer}>
              <TimeSelector
                label="Start time"
                value={prefs.quietHoursStart}
                onChange={(t) => handleTimeChange('quietHoursStart', t)}
                disabled={!globalEnabled || isSaving}
              />
              <View style={styles.timeDivider} />
              <TimeSelector
                label="End time"
                value={prefs.quietHoursEnd}
                onChange={(t) => handleTimeChange('quietHoursEnd', t)}
                disabled={!globalEnabled || isSaving}
              />
              <View style={styles.timeDivider} />
              <View style={styles.timezoneRow}>
                <Text style={[styles.rowDescription, !globalEnabled && styles.textDisabled]}>
                  Timezone
                </Text>
                <Text style={[styles.rowDescription, { color: '#555' }, !globalEnabled && styles.textDisabled]}>
                  {prefs.quietHoursTimezone}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* Notification types */}
      <Text style={styles.sectionHeader}>Notification types</Text>
      <Text style={styles.sectionSubtitle}>
        Choose which kinds of in-app notifications you want to receive. These are ignored while the master switch above is off.
      </Text>

      <View style={styles.section}>
        {NOTIFICATION_TYPES.map(({ key, title, description }, idx) => {
          const value = prefs[key] as boolean;
          const disabled = !globalEnabled || isSaving;
          return (
            <View
              key={key}
              style={[styles.row, idx === NOTIFICATION_TYPES.length - 1 && styles.rowLast]}
            >
              <View style={styles.rowInfo}>
                <Text style={[styles.rowTitle, !globalEnabled && styles.textDisabled]}>{title}</Text>
                <Text style={[styles.rowDescription, !globalEnabled && styles.textDisabled]}>{description}</Text>
              </View>
              <Switch
                value={value}
                onValueChange={(v) => handleToggle(key, v)}
                disabled={disabled}
                trackColor={{ false: "#ccc", true: "#007AFF" }}
                thumbColor="#fff"
              />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  section: { borderTopWidth: 1, borderTopColor: "#eee" },
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
  rowLast: { borderBottomWidth: 0 },
  rowInfo: { flex: 1, marginRight: 16 },
  rowTitle: { fontSize: 16, fontWeight: "500" },
  rowDescription: { fontSize: 13, color: "#888", marginTop: 3 },
  textDisabled: { color: "#bbb" },
  timePickerContainer: {
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  timeDivider: { height: 1, backgroundColor: '#eee' },
  timezoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
});
