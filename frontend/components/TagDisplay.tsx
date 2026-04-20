import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Tag } from '../services/api';
import { TAG_TYPE_COLORS } from '../constants/theme';

interface TagDisplayProps {
  tags: Tag[];
}

export default function TagDisplay({ tags }: TagDisplayProps) {
  const router = useRouter();
  if (!tags || tags.length === 0) return null;

  return (
    <View style={styles.container}>
      {tags.map(tag => {
        const color = TAG_TYPE_COLORS[tag.type] || '#999';
        return (
          <TouchableOpacity
            key={tag.id}
            style={[styles.tag, { borderColor: color }]}
            onPress={() => router.push(`/feeds/hashtag?tagId=${tag.id}&tagName=${encodeURIComponent(tag.name)}` as any)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tagText, { color }]}>{tag.name}</Text>
          </TouchableOpacity>
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
