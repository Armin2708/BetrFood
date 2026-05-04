import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, ThemePreference } from '../../../../context/ThemeContext';

const OPTIONS: { key: ThemePreference; title: string; description: string }[] = [
  {
    key: 'light',
    title: 'Light Mode',
    description: 'Always use the light theme.',
  },
  {
    key: 'dark',
    title: 'Dark Mode',
    description: 'Always use the dark theme.',
  },
  {
    key: 'system',
    title: 'System Default',
    description: 'Follow your device appearance automatically.',
  },
];

export default function AppearanceSettingsScreen() {
  const { colors, themePreference, resolvedTheme, setThemePreference } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={[styles.headerCard, { backgroundColor: colors.backgroundElevated }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Theme</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Choose how BetrFood looks across the app. Changes apply immediately and stay saved for your next session.
        </Text>
        <Text style={[styles.currentTheme, { color: colors.textSecondary }]}>
          Active theme: {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
        </Text>
      </View>

      <View style={[styles.optionsCard, { backgroundColor: colors.backgroundElevated }]}>
        {OPTIONS.map((option, index) => {
          const selected = themePreference === option.key;

          return (
            <React.Fragment key={option.key}>
              <Pressable
                style={styles.optionRow}
                onPress={() => setThemePreference(option.key)}
              >
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                    {option.title}
                  </Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    {option.description}
                  </Text>
                </View>
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={selected ? colors.primary : colors.textTertiary}
                />
              </Pressable>
              {index < OPTIONS.length - 1 ? (
                <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  currentTheme: {
    fontSize: 13,
    marginTop: 12,
    fontWeight: '600',
  },
  optionsCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  optionCopy: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  optionDescription: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 18,
  },
});
