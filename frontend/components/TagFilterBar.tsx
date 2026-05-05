import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchTags, Tag } from '../services/api';
import { TAG_TYPE_COLORS, ThemeColors } from '../constants/theme';
import { useScaledTypography } from '../hooks/useScaledTypography';
import { usePantry } from '../context/PantryContext';
import { useAppTheme } from '../context/ThemeContext';

interface TagFilterBarProps {
  selectedTagIds: number[];
  onFilterChange: (tagIds: number[]) => void;
  pantryFilterActive?: boolean;
  onPantryFilterChange?: (active: boolean) => void;
}

export default function TagFilterBar({
  selectedTagIds,
  onFilterChange,
  pantryFilterActive = false,
  onPantryFilterChange,
}: TagFilterBarProps) {
  const { colors } = useAppTheme();
  const scaledTypography = useScaledTypography();
  const styles = useMemo(() => makeStyles(colors, scaledTypography), [colors, scaledTypography]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const { items: pantryItems } = usePantry();

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

  const clearFilters = () => onFilterChange([]);

  const tagsByType = tags.reduce<Record<string, Tag[]>>((acc, tag) => {
    if (!acc[tag.type]) acc[tag.type] = [];
    acc[tag.type].push(tag);
    return acc;
  }, {});

  const hasActiveFilters = selectedTagIds.length > 0;

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
        {/* Filters button */}
        <TouchableOpacity
          style={[styles.filterChip, hasActiveFilters && styles.filtersChipActive]}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Open tag filters"
        >
          <Ionicons
            name="options-outline"
            size={13}
            color={hasActiveFilters ? '#fff' : colors.textSecondary}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.filterChipText, hasActiveFilters && styles.filtersChipTextActive]}>
            Filters{hasActiveFilters ? ` (${selectedTagIds.length})` : ''}
          </Text>
        </TouchableOpacity>

        {/* Pantry filter — second */}
        {pantryItems.length > 0 && onPantryFilterChange && (
          <TouchableOpacity
            style={[styles.filterChip, pantryFilterActive && styles.pantryChipActive]}
            onPress={() => onPantryFilterChange(!pantryFilterActive)}
            accessibilityRole="button"
            accessibilityLabel={pantryFilterActive ? 'Remove pantry filter' : 'Filter by pantry'}
            accessibilityState={{ selected: pantryFilterActive }}
          >
            <Ionicons
              name="basket-outline"
              size={13}
              color={pantryFilterActive ? '#fff' : '#22C55E'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filterChipText, pantryFilterActive && styles.pantryChipTextActive]}>
              {pantryFilterActive ? 'Pantry ✕' : 'Filter by pantry'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Active tag chips shown inline for quick removal */}
        {tags
          .filter(t => selectedTagIds.includes(t.id))
          .map(tag => {
            const color = TAG_TYPE_COLORS[tag.type] || '#999';
            return (
              <TouchableOpacity
                key={tag.id}
                style={[styles.filterChip, { backgroundColor: color, borderColor: color }]}
                onPress={() => toggleTag(tag.id)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${tag.name} filter`}
              >
                <Text style={[styles.filterChipText, { color: '#fff' }]}>
                  {tag.name} ✕
                </Text>
              </TouchableOpacity>
            );
          })}
      </ScrollView>

      {/* Tag filter modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, scaledTypography.subtitle]}>Filter by Tags</Text>
              <View style={styles.modalHeaderRight}>
                {hasActiveFilters && (
                  <TouchableOpacity onPress={clearFilters} style={styles.clearButton}>
                    <Text style={[styles.clearText, scaledTypography.caption]}>Clear all</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {Object.entries(tagsByType).map(([type, typeTags]) => (
                <View key={type} style={styles.tagGroup}>
                  <Text style={styles.tagGroupLabel}>{type}</Text>
                  <View style={styles.tagGroupChips}>
                    {typeTags.map(tag => {
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
                           <Text style={[
                             styles.filterChipText,
                             scaledTypography.caption,
                             isSelected ? { color: '#fff' } : { color: colors.textSecondary },
                           ]}>
                             {tag.name}
                           </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.doneButtonText, scaledTypography.label]}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ThemeColors, scaledTypography: any) {
  return StyleSheet.create({
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
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipText: {
      color: colors.textSecondary,
    },
    pantryChipActive: {
      backgroundColor: '#22C55E',
      borderColor: '#22C55E',
    },
    pantryChipTextActive: {
      color: '#fff',
    },
    filtersChipActive: {
      backgroundColor: colors.textPrimary,
      borderColor: colors.textPrimary,
    },
    filtersChipTextActive: {
      color: '#fff',
    },
    clearButton: {
      marginRight: 12,
    },
    clearText: {
      color: '#e74c3c',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.backgroundElevated,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '70%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    modalTitle: {
      color: colors.textPrimary,
    },
    tagGroup: {
      marginBottom: 16,
    },
    tagGroupLabel: {
      color: colors.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    tagGroupChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    doneButton: {
      marginTop: 16,
      backgroundColor: '#22C55E',
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
    },
    doneButtonText: {
      color: '#fff',
    },
  });
}
