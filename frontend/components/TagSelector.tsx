import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { fetchTags, Tag } from '../services/api';

interface TagSelectorProps {
  selectedTagIds: number[];
  onSelectionChange: (tagIds: number[]) => void;
}

const TYPE_LABELS: Record<string, string> = {
  cuisine: 'Cuisine',
  meal: 'Meal Type',
  dietary: 'Dietary',
};

const TYPE_COLORS: Record<string, string> = {
  cuisine: '#22C55E',
  meal: '#4CAF50',
  dietary: '#2196F3',
};

export default function TagSelector({ selectedTagIds, onSelectionChange }: TagSelectorProps) {
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
      onSelectionChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onSelectionChange([...selectedTagIds, tagId]);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#22C55E" />
      </View>
    );
  }

  const groupedTags = tags.reduce<Record<string, Tag[]>>((acc, tag) => {
    if (!acc[tag.type]) acc[tag.type] = [];
    acc[tag.type].push(tag);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Tags</Text>
      {Object.entries(groupedTags).map(([type, typeTags]) => (
        <View key={type} style={styles.typeGroup}>
          <Text style={[styles.typeLabel, { color: TYPE_COLORS[type] || '#333' }]}>
            {TYPE_LABELS[type] || type}
          </Text>
          <View style={styles.chipContainer}>
            {typeTags.map(tag => {
              const isSelected = selectedTagIds.includes(tag.id);
              const color = TYPE_COLORS[tag.type] || '#333';
              return (
                <TouchableOpacity
                  key={tag.id}
                  style={[
                    styles.chip,
                    isSelected
                      ? { backgroundColor: color, borderColor: color }
                      : { borderColor: color },
                  ]}
                  onPress={() => toggleTag(tag.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected ? styles.chipTextSelected : { color },
                    ]}
                  >
                    {tag.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  typeGroup: {
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
  },
});
