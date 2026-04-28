/**
 * Text Size Settings Screen
 * Allows users to adjust text size for accessibility.
 * Features:
 * - Live preview of text size changes (via TextSizeContext)
 * - Radio button selection for preset sizes
 * - Save preference to backend (via PreferencesContext)
 */

import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors, typography, spacing, radius } from '../../../../constants/theme';
import { usePreferences } from '../../../../context/PreferencesContext';
import { useTextSize } from '../../../../context/TextSizeContext';
import {
  TextSizeScale,
  TEXT_SIZE_MULTIPLIERS,
  getTextSizeName,
  getTextSizeDescription,
  scaleFontSize,
} from '../../../../utils/textSizeScaling';

const TEXT_SIZE_OPTIONS: TextSizeScale[] = ['small', 'default', 'large', 'xLarge'];

export default function TextSizeSettings() {
  const router = useRouter();
  const { preferences, loading, saving, updatePreferences } = usePreferences();
  const { scale, setScale } = useTextSize();

  // Local state for editing - separate from global context
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

  // Update live preview immediately (TextSizeContext)
  const handleSelectSize = (size: TextSizeScale) => {
    setLocalScale(size);
    setScale(size); // Update live preview
  };

  // Save preference to backend
  const handleSave = async () => {
    if (!localScale) return;
    await updatePreferences({ textSizeScale: localScale });
  };

  if (loading || !preferences) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  // Calculate scaled font sizes for preview
  const multiplier = TEXT_SIZE_MULTIPLIERS[localScale];
  const previewHeadingSize = scaleFontSize(typography.title.fontSize, multiplier);
  const previewBodySize = scaleFontSize(typography.body.fontSize, multiplier);
  const previewCaptionSize = scaleFontSize(typography.caption.fontSize, multiplier);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <View style={styles.descriptionSection}>
          <Text style={styles.description}>
            Adjust text size across the app for better readability. Changes will be previewed in real time.
          </Text>
        </View>

        {/* Live Preview Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={styles.previewCard}>
            <Text
              style={[
                styles.previewHeading,
                {
                  fontSize: previewHeadingSize,
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
                },
              ]}
            >
              Caption text
            </Text>
          </View>
        </View>

        {/* Size Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Text Size</Text>

          {TEXT_SIZE_OPTIONS.map((size) => {
            const isSelected = localScale === size;
            const multiplierValue = TEXT_SIZE_MULTIPLIERS[size];
            const displayName = getTextSizeName(size);
            const description = getTextSizeDescription(size);

            return (
              <Pressable
                key={size}
                style={[styles.sizeOption, isSelected && styles.sizeOptionActive]}
                onPress={() => handleSelectSize(size)}
                accessible
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${displayName} text size (${multiplierValue}x)`}
              >
                <View style={styles.radioOuter}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
                <View style={styles.sizeOptionContent}>
                  <Text style={[styles.sizeOptionLabel, isSelected && styles.sizeOptionLabelActive]}>
                    {displayName}
                  </Text>
                  <Text style={[styles.sizeOptionDescription, isSelected && styles.sizeOptionDescriptionActive]}>
                    {description}
                  </Text>
                  <Text style={[styles.sizeOptionMultiplier, isSelected && styles.sizeOptionMultiplierActive]}>
                    {multiplierValue}x size
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Information Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="information-circle-outline" size={20} color={colors.info} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Accessibility</Text>
            <Text style={styles.infoText}>
              Text size preferences are saved and will apply across all screens in the app.
            </Text>
          </View>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={[
            styles.saveButton,
            (saving || localScale === preferences.textSizeScale) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={saving || localScale === preferences.textSizeScale}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>
              {localScale === preferences.textSizeScale ? 'Saved' : 'Save Text Size'}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 32,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.subtitle.fontSize,
    fontWeight: typography.subtitle.fontWeight,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  descriptionSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  description: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    lineHeight: 20,
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
  sizeOptionActive: {
    backgroundColor: '#F0FDF4',
    borderColor: colors.primary,
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
  sizeOptionLabelActive: {
    color: colors.primary,
  },
  sizeOptionDescription: {
    fontSize: typography.small.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  sizeOptionDescriptionActive: {
    color: colors.textSecondary,
  },
  sizeOptionMultiplier: {
    fontSize: typography.small.fontSize,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  sizeOptionMultiplierActive: {
    color: colors.primary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
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
  spacer: {
    height: spacing.xl,
  },
  buttonContainer: {
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
