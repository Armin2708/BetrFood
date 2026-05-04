import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TagFilterBar from './TagFilterBar';
import { shadows } from '../constants/theme';
import { useScaledTypography } from '../hooks/useScaledTypography';
import { useAppTheme } from '../context/ThemeContext';

type FeedTab = 'following' | 'community' | 'explore';

const TABS: { key: FeedTab; label: string }[] = [
  { key: 'following', label: 'Following' },
  { key: 'community', label: 'Community' },
  { key: 'explore', label: 'Explore' },
];

type FeedHeaderProps = {
  feedType: FeedTab;
  onFeedTypeChange: (type: FeedTab) => void;
  selectedTagIds: number[];
  onTagFilterChange: (tagIds: number[]) => void;
  pantryFilterActive: boolean;
  onPantryFilterChange: (active: boolean) => void;
  onSearchPress: () => void;
};

export default function FeedHeader({
  feedType,
  onFeedTypeChange,
  selectedTagIds,
  onTagFilterChange,
  pantryFilterActive,
  onPantryFilterChange,
  onSearchPress,
}: FeedHeaderProps) {
  const scaledTypography = useScaledTypography();
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundElevated }]}>
      <View style={[styles.feedToggle, { backgroundColor: colors.backgroundElevated }]}>
        <View style={styles.feedToggleTabs}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={styles.feedToggleTab}
              onPress={() => onFeedTypeChange(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: feedType === tab.key }}
            >
              <Text
                style={[
                  styles.feedToggleText,
                  scaledTypography.label,
                  { color: colors.textPrimary },
                  feedType === tab.key && styles.feedToggleTextActive,
                  feedType === tab.key && { color: colors.primary },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={onSearchPress}
          accessibilityRole="button"
          accessibilityLabel="Search"
        >
          <Ionicons name="search-outline" size={19} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      {feedType !== 'explore' ? (
        <TagFilterBar
          selectedTagIds={selectedTagIds}
          onFilterChange={onTagFilterChange}
          pantryFilterActive={pantryFilterActive}
          onPantryFilterChange={onPantryFilterChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
    boxShadow: shadows.md,
    elevation: 3,
    zIndex: 10,
  },
  feedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  feedToggleTabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  feedToggleTab: {
    paddingVertical: 12,
  },
  feedToggleText: {
    fontSize: 17,
    fontWeight: '600',
  },
  feedToggleTextActive: {
  },
  searchButton: {},
});
