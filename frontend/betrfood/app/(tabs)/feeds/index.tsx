import React, { useState, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity, Text,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import Post from '../../../components/Post';
import { fetchPosts, getImageUrl, Post as PostType } from '../../../services/api';

const CURRENT_USER_ID = 'current-user';

export default function HomeScreen() {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPosts = useCallback(async () => {
    try {
      const result = await fetchPosts();
      setPosts(result.posts);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadPosts(); }, [loadPosts]));

  const onRefresh = () => { setRefreshing(true); loadPosts(); };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <Post
            id={item.id}
            profilePic={`https://ui-avatars.com/api/?name=${item.userId}&background=random`}
            username={item.userId}
            postImage={getImageUrl(item.imagePath)}
            caption={item.caption}
            userId={item.userId}
            currentUserId={CURRENT_USER_ID}
            onDeleted={handlePostDeleted}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No posts yet. Be the first to share!</Text>
          </View>
        }
        contentContainerStyle={posts.length === 0 ? styles.emptyList : undefined}
      />
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/create-post')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#999' },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56,
    borderRadius: 28, backgroundColor: '#FF6B35', justifyContent: 'center',
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: -2 },
});
