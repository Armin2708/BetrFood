import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Text, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import Post from '../../../components/Post';
import PostSkeleton from '../../../components/PostSkeleton';
import { getImageUrl, fetchPosts, Post as PostType } from '../../../services/api';

const PAGE_LIMIT = 10;

export default function HomeScreen() {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchPosts(null, PAGE_LIMIT);
      setPosts(data.posts); setNextCursor(data.nextCursor); setHasMore(data.hasMore);
    } catch (err: any) { setError(err.message || 'Something went wrong'); }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await fetchPosts(nextCursor, PAGE_LIMIT);
      setPosts(prev => [...prev, ...data.posts]); setNextCursor(data.nextCursor); setHasMore(data.hasMore);
    } catch (err: any) { setError(err.message || 'Failed to load more'); }
    finally { setLoadingMore(false); }
  }, [loadingMore, hasMore, nextCursor]);

  const fetchInitial = useCallback(async () => { setLoading(true); await loadPosts(); setLoading(false); }, [loadPosts]);
  const refresh = useCallback(async () => { setRefreshing(true); await loadPosts(); setRefreshing(false); }, [loadPosts]);

  useFocusEffect(useCallback(() => { fetchInitial(); }, [fetchInitial]));

  const handleEndReached = useCallback(() => { if (!loadingMore && hasMore) loadMore(); }, [loadingMore, hasMore, loadMore]);

  if (loading) return (<View style={styles.container}><PostSkeleton /><PostSkeleton /><PostSkeleton /></View>);

  if (error && posts.length === 0) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchInitial}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <Post
            profilePic={`https://ui-avatars.com/api/?name=${item.userId}&background=random`}
            username={item.userId}
            postImage={getImageUrl(item.imagePath)}
            caption={item.caption}
          />
        )}
        ListFooterComponent={loadingMore ? (<View style={styles.footer}><ActivityIndicator size="small" color="#FF6B35" /></View>) : null}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>No posts yet</Text><Text style={styles.emptyText}>Be the first to share a meal!</Text></View>}
        contentContainerStyle={posts.length === 0 ? styles.emptyList : undefined}
      />
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/create-post')}><Text style={styles.fabText}>+</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: '#e74c3c', textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#FF6B35', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { paddingVertical: 20, alignItems: 'center' },
  empty: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#666', marginBottom: 8 },
  emptyText: { fontSize: 16, color: '#999' },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  fabText: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: -2 },
});
