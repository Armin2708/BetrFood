import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tag } from '../services/api';

interface TagDisplayProps {
  tags: Tag[];
}

const TYPE_COLORS: Record<string, string> = {
  cuisine: '#FF6B35',
  meal: '#4CAF50',
  dietary: '#2196F3',
};

export default function TagDisplay({ tags }: TagDisplayProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <View style={styles.container}>
      {tags.map(tag => {
        const color = TYPE_COLORS[tag.type] || '#999';
        return (
          <View key={tag.id} style={[styles.tag, { borderColor: color }]}>
            <Text style={[styles.tagText, { color }]}>{tag.name}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingBottom: 8,
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
