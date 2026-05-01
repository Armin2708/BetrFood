import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { FeedLayout, useFeedLayout } from "../../../../context/FeedLayoutContext";
import { ThemePreference, useAppTheme } from "../../../../context/ThemeContext";
import { usePreferences } from "../../../../context/PreferencesContext";
import {
  TextSizeScale,
  TEXT_SIZE_MULTIPLIERS,
  getTextSizeName,
  getTextSizeDescription,
  scaleFontSize,
} from "../../../../utils/textSizeScaling";
import { colors, typography, spacing, radius } from "../../../../constants/theme";

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

const TEXT_SIZE_OPTIONS: TextSizeScale[] = ['small', 'default', 'large', 'xLarge'];

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
  const { colors: themeColors, themePreference, resolvedTheme, setThemePreference, textSizeScale, setTextSizeScale } = useAppTheme();
  const { layout, setLayout } = useFeedLayout();
  const { preferences, loading, saving, updatePreferences } = usePreferences();

  // Text size local state for editing - separate from global context
  const [localScale, setLocalScale] = useState<TextSizeScale>('default');

  // Initialize local state from context preferences when they load
  useEffect(() => {
    if (preferences?.textSizeScale) {
      setLocalScale(preferences.textSizeScale);
    }
  }, [preferences?.textSizeScale]);

  // Reset local state to database values when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (preferences?.textSizeScale) {
        setLocalScale(preferences.textSizeScale);
      }
    }, [preferences?.textSizeScale])
  );

  // Update live preview immediately
  const handleSelectSize = (size: TextSizeScale) => {
    setLocalScale(size);
    setTextSizeScale(size);
  };

  // Save text size preference to backend
  const handleSaveTextSize = async () => {
    if (!localScale) return;
    await updatePreferences({ textSizeScale: localScale });
  };

  if (loading || !preferences) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  // Calculate scaled font sizes for preview
  const multiplier = TEXT_SIZE_MULTIPLIERS[localScale];
  const previewHeadingSize = scaleFontSize(typography.title.fontSize, multiplier);
  const previewBodySize = scaleFontSize(typography.body.fontSize, multiplier);
  const previewCaptionSize = scaleFontSize(typography.caption.fontSize, multiplier);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.sectionHeader, { color: themeColors.textTertiary }]}>THEME</Text>
      <Text style={[styles.sectionDescription, { color: themeColors.textSecondary }]}>
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
                { backgroundColor: themeColors.backgroundElevated, borderColor: themeColors.borderLight },
                selected && { borderColor: themeColors.primary },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.title} theme`}
            >
              <View
                style={[
                  styles.iconBubble,
                  { backgroundColor: themeColors.backgroundTertiary },
                  selected && { backgroundColor: themeColors.recipeBackground },
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={22}
                  color={selected ? themeColors.primary : themeColors.textSecondary}
                />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: themeColors.textPrimary }]}>{option.title}</Text>
                <Text style={[styles.optionDescription, { color: themeColors.textSecondary }]}>
                  {option.description}
                </Text>
              </View>
              <View style={[styles.radio, { borderColor: selected ? themeColors.primary : themeColors.border }]}>
                {selected && <View style={[styles.radioDot, { backgroundColor: themeColors.primary }]} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionHeader, { color: themeColors.textTertiary, marginTop: 28 }]}>FEED LAYOUT</Text>
      <Text style={[styles.sectionDescription, { color: themeColors.textSecondary }]}>
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
                { backgroundColor: themeColors.backgroundElevated, borderColor: themeColors.borderLight },
                selected && { borderColor: themeColors.primary },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${option.title} layout`}
            >
              <View
                style={[
                  styles.iconBubble,
                  { backgroundColor: themeColors.backgroundTertiary },
                  selected && { backgroundColor: themeColors.recipeBackground },
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={22}
                  color={selected ? themeColors.primary : themeColors.textSecondary}
                />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: themeColors.textPrimary }]}>{option.title}</Text>
                <Text style={[styles.optionDescription, { color: themeColors.textSecondary }]}>
                  {option.description}
                </Text>
              </View>
              <View style={[styles.radio, { borderColor: selected ? themeColors.primary : themeColors.border }]}>
                {selected && <View style={[styles.radioDot, { backgroundColor: themeColors.primary }]} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionHeader, { color: themeColors.textTertiary, marginTop: 28 }]}>TEXT SIZE</Text>
      <Text style={[styles.sectionDescription, { color: themeColors.textSecondary }]}>
        Adjust text size across the app for better readability. Changes will be previewed in real time.
      </Text>

      {/* Live Preview Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Preview</Text>
        <View style={[styles.previewCard, { backgroundColor: themeColors.backgroundSecondary, borderColor: themeColors.border }]}>
          <Text
            style={[
              styles.previewHeading,
              {
                fontSize: previewHeadingSize,
                color: themeColors.textPrimary,
              },
            ]}
          >
            Heading Preview
          </Text>
          <Text
            style={[
              styles.previewBody,
              {
                fontSize: previewBodySize,
                color: themeColors.textSecondary,
              },
            ]}
          >
            This is how body text will look at the selected size. It's important to be able to read content comfortably.
          </Text>
          <Text
            style={[
              styles.previewCaption,
              {
                fontSize: previewCaptionSize,
                color: themeColors.textTertiary,
              },
            ]}
          >
            Caption text
          </Text>
        </View>
      </View>

      {/* Size Selection */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Select Text Size</Text>

        {TEXT_SIZE_OPTIONS.map((size) => {
          const isSelected = localScale === size;
          const multiplierValue = TEXT_SIZE_MULTIPLIERS[size];
          const displayName = getTextSizeName(size);
          const description = getTextSizeDescription(size);

          return (
            <Pressable
              key={size}
              style={[
                styles.sizeOption,
                { backgroundColor: themeColors.backgroundMuted, borderColor: themeColors.border },
                isSelected && { backgroundColor: '#F0FDF4', borderColor: themeColors.primary },
              ]}
              onPress={() => handleSelectSize(size)}
              accessible
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${displayName} text size (${multiplierValue}x)`}
            >
              <View style={[styles.radioOuter, { borderColor: isSelected ? themeColors.primary : themeColors.textTertiary }]}>
                {isSelected && <View style={[styles.radioInner, { backgroundColor: themeColors.primary }]} />}
              </View>
              <View style={styles.sizeOptionContent}>
                <Text style={[styles.sizeOptionLabel, { color: isSelected ? themeColors.primary : themeColors.textPrimary }]}>
                  {displayName}
                </Text>
                <Text style={[styles.sizeOptionDescription, { color: themeColors.textSecondary }]}>
                  {description}
                </Text>
                <Text style={[styles.sizeOptionMultiplier, { color: isSelected ? themeColors.primary : themeColors.textTertiary }]}>
                  {multiplierValue}x size
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Accessibility Info Card */}
      <View style={[styles.infoCard, { borderLeftColor: themeColors.info }]}>
        <View style={styles.infoIcon}>
          <Ionicons name="information-circle-outline" size={20} color={themeColors.info} />
        </View>
        <View style={styles.infoContent}>
          <Text style={[styles.infoTitle, { color: themeColors.textPrimary }]}>Accessibility</Text>
          <Text style={[styles.infoText, { color: themeColors.textSecondary }]}>
            Text size preferences are saved and will apply across all screens in the app.
          </Text>
        </View>
      </View>

      {/* Save Text Size Button */}
      <Pressable
        style={[
          styles.saveButton,
          { backgroundColor: themeColors.primary },
          (saving || localScale === preferences.textSizeScale) && styles.saveButtonDisabled,
        ]}
        onPress={handleSaveTextSize}
        disabled={saving || localScale === preferences.textSizeScale}
      >
        {saving ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.saveButtonText}>
            {localScale === preferences.textSizeScale ? 'Text Size Saved' : 'Save Text Size'}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
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
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  previewCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewHeading: {
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  previewBody: {
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  previewCaption: {
    fontWeight: '400',
    color: colors.textTertiary,
  },
  sizeOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundMuted,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginRight: spacing.md,
    flexShrink: 0,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  sizeOptionContent: {
    flex: 1,
  },
  sizeOptionLabel: {
    fontSize: typography.label.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sizeOptionDescription: {
    fontSize: typography.small.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  sizeOptionMultiplier: {
    fontSize: typography.small.fontSize,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
    marginBottom: spacing.xl,
  },
  infoIcon: {
    marginRight: spacing.md,
    marginTop: spacing.xs,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: typography.label.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: typography.small.fontSize,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundPrimary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: typography.label.fontSize,
  },
});
