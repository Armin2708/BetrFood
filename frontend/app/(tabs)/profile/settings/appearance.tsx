import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FeedLayout, useFeedLayout } from "../../../../context/FeedLayoutContext";
import { ThemePreference, useAppTheme } from "../../../../context/ThemeContext";

interface LayoutOption {
  value: FeedLayout;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface ThemeOption {
  value: ThemePreference;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const OPTIONS: LayoutOption[] = [
  {
    value: "grid",
    title: "Grid",
    description: "Compact 3-column grid. See more posts at a glance.",
    icon: "grid-outline",
  },
  {
    value: "list",
    title: "List",
    description: "Single column with larger previews and captions.",
    icon: "list-outline",
  },
];

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "light",
    title: "Light Mode",
    description: "Always use the light theme.",
    icon: "sunny-outline",
  },
  {
    value: "dark",
    title: "Dark Mode",
    description: "Always use the dark theme.",
    icon: "moon-outline",
  },
  {
    value: "system",
    title: "System Default",
    description: "Follow your device appearance automatically.",
    icon: "phone-portrait-outline",
  },
];

export default function AppearanceSettings() {
  const { colors, themePreference, resolvedTheme, setThemePreference } = useAppTheme();
  const { layout, setLayout } = useFeedLayout();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>THEME</Text>
      <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
        Switch between light, dark, and system appearance. Active theme: {resolvedTheme === "dark" ? "Dark" : "Light"}.
      </Text>

      <View style={styles.optionsGroup}>
        {THEME_OPTIONS.map((option) => {
          const selected = themePreference === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setThemePreference(option.value)}
              style={[
                styles.optionCard,
                { backgroundColor: colors.backgroundElevated, borderColor: colors.borderLight },
                selected && { borderColor: colors.primary },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.title} theme`}
            >
              <View
                style={[
                  styles.iconBubble,
                  { backgroundColor: colors.backgroundTertiary },
                  selected && { backgroundColor: colors.recipeBackground },
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={22}
                  color={selected ? colors.primary : colors.textSecondary}
                />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>{option.title}</Text>
                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                  {option.description}
                </Text>
              </View>
              <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }]}>
                {selected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionHeader, { color: colors.textTertiary, marginTop: 28 }]}>FEED LAYOUT</Text>
      <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
        Choose how posts appear on profile feeds. Changes apply instantly.
      </Text>

      <View style={styles.optionsGroup}>
        {OPTIONS.map((option) => {
          const selected = layout === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setLayout(option.value)}
              style={[
                styles.optionCard,
                { backgroundColor: colors.backgroundElevated, borderColor: colors.borderLight },
                selected && { borderColor: colors.primary },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.title} layout`}
            >
              <View
                style={[
                  styles.iconBubble,
                  { backgroundColor: colors.backgroundTertiary },
                  selected && { backgroundColor: colors.recipeBackground },
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={22}
                  color={selected ? colors.primary : colors.textSecondary}
                />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>{option.title}</Text>
                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                  {option.description}
                </Text>
              </View>
              <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }]}>
                {selected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 6,
    marginLeft: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 16,
    marginLeft: 4,
    lineHeight: 18,
  },
  optionsGroup: {
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    gap: 14,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
