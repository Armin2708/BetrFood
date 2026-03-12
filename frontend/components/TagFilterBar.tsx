import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { fetchTags, Tag } from '../services/api';
import { TAG_TYPE_COLORS, colors } from '../constants/theme';

interface TagFilterBarProps {
  selectedTagIds: number[];
  onFilterChange: (tagIds: number[]) => void;
}

export default function TagFilterBar({ selectedTagIds, onFilterChange }: TagFilterBarProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTags()
      .then(setTags)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleTag = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      onFilterChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onFilterChange([...selectedTagIds, tagId]);
    }
  };

  const clearFilters = () => {
    onFilterChange([]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {selectedTagIds.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters} accessibilityRole="button" accessibilityLabel="Clear all tag filters">
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
        {tags.map(tag => {
          const isSelected = selectedTagIds.includes(tag.id);
          const color = TAG_TYPE_COLORS[tag.type] || '#999';
          return (
            <TouchableOpacity
              key={tag.id}
              style={[
                styles.filterChip,
                isSelected
                  ? { backgroundColor: color, borderColor: color }
                  : { borderColor: colors.border },
              ]}
              onPress={() => toggleTag(tag.id)}
              accessibilityRole="button"
              accessibilityLabel={`${isSelected ? 'Remove' : 'Add'} ${tag.name} filter`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isSelected ? { color: colors.white } : { color: colors.textSecondary },
                ]}
              >
                {tag.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundPrimary,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  loadingContainer: {
    padding: 12,
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.backgroundTertiary,
  },
  clearText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
