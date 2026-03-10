import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { fetchTags, Tag } from '../services/api';

interface TagFilterBarProps {
  selectedTagIds: number[];
  onFilterChange: (tagIds: number[]) => void;
}

const TYPE_COLORS: Record<string, string> = {
  cuisine: '#FF6B35',
  meal: '#4CAF50',
  dietary: '#2196F3',
};

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
        <ActivityIndicator size="small" color="#FF6B35" />
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
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
        {tags.map(tag => {
          const isSelected = selectedTagIds.includes(tag.id);
          const color = TYPE_COLORS[tag.type] || '#999';
          return (
            <TouchableOpacity
              key={tag.id}
              style={[
                styles.filterChip,
                isSelected
                  ? { backgroundColor: color, borderColor: color }
                  : { borderColor: '#ddd' },
              ]}
              onPress={() => toggleTag(tag.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isSelected ? { color: '#fff' } : { color: '#666' },
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
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
    backgroundColor: '#f0f0f0',
  },
  clearText: {
    fontSize: 13,
    color: '#666',
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
