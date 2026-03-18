import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import type { Draft } from './create-post';

const DRAFTS_STORAGE_KEY = 'drafts';

export default function DraftsScreen() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDrafts = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);
      setDrafts(raw ? JSON.parse(raw) : []);
    } catch {
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDrafts();
    }, [loadDrafts])
  );

  const deleteDraft = async (id: string) => {
    Alert.alert('Delete Draft', 'Are you sure you want to delete this draft?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const filtered = drafts.filter((d) => d.id !== id);
            await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(filtered));
            setDrafts(filtered);
          } catch {
            Alert.alert('Error', 'Failed to delete draft.');
          }
        },
      },
    ]);
  };

  const openDraft = (id: string) => {
    router.push({ pathname: '/create-post', params: { draftId: id } });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderDraft = ({ item }: { item: Draft }) => {
    const preview = item.caption.trim()
      ? item.caption.substring(0, 80) + (item.caption.length > 80 ? '...' : '')
      : 'No caption';

    const details: string[] = [];
    if (item.selectedTagIds.length > 0) details.push(`${item.selectedTagIds.length} tags`);
    if (item.showRecipe) details.push('Recipe');

    return (
      <TouchableOpacity style={styles.draftItem} onPress={() => openDraft(item.id)}>
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.draftThumbnail} />
        ) : (
          <View style={[styles.draftThumbnail, styles.draftThumbnailPlaceholder]}>
            <Ionicons name="image-outline" size={20} color="#ccc" />
          </View>
        )}
        <View style={styles.draftContent}>
          <Text style={styles.draftPreview} numberOfLines={2}>{preview}</Text>
          {details.length > 0 && (
            <Text style={styles.draftDetails}>{details.join(' / ')}</Text>
          )}
          <Text style={styles.draftDate}>{formatDate(item.timestamp)}</Text>
        </View>
        <TouchableOpacity style={styles.deleteButton} onPress={() => deleteDraft(item.id)}>
          <Ionicons name="trash-outline" size={20} color="#ff3b30" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Drafts</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={drafts}
        keyExtractor={(item) => item.id}
        renderItem={renderDraft}
        contentContainerStyle={drafts.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>No drafts saved</Text>
            <Text style={styles.emptySubtitle}>
              Drafts you save while creating a post will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
  },
  draftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 10,
  },
  draftThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#eee',
  },
  draftThumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  draftContent: {
    flex: 1,
  },
  draftPreview: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  draftDetails: {
    fontSize: 13,
    color: '#FF6B35',
    marginTop: 4,
  },
  draftDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
});
