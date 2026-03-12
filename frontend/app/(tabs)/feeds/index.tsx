import React, { useState, useCallback, useContext, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import Post from '../../../components/Post';
import PostSkeleton from '../../../components/PostSkeleton';
import TagFilterBar from '../../../components/TagFilterBar';
import { AuthContext } from '../../../context/AuthenticationContext';
import {
  fetchPosts,
  fetchPostsByTags,
  fetchFollowingFeed,
  getImageUrl,
  Post as PostType,
} from '../../../services/api';

const PAGE_LIMIT = 10;

export default function HomeScreen() {
  const { user } = useContext(AuthContext);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [feedType, setFeedType] = useState<'forYou' | 'following'>('forYou');

  const loadPosts = useCallback(async (tagIds: number[] = [], feed: 'forYou' | 'following' = 'forYou') => {
    setError(null);
    try {
      if (tagIds.length > 0) {
        const filteredPosts = await fetchPostsByTags(tagIds);
        setPosts(filteredPosts);
        setHasMore(false);
        setNextCursor(null);
      } else if (feed === 'following') {
        const data = await fetchFollowingFeed(null, PAGE_LIMIT);
        setPosts(data.posts);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } else {
        const data = await fetchPosts(null, PAGE_LIMIT);
        setPosts(data.posts);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor || selectedTagIds.length > 0) return;
    setLoadingMore(true);
    try {
      const data = feedType === 'following'
        ? await fetchFollowingFeed(nextCursor, PAGE_LIMIT)
        : await fetchPosts(nextCursor, PAGE_LIMIT);
      setPosts(prev => [...prev, ...data.posts]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err: any) {
      setError(err.message || 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, nextCursor, selectedTagIds, feedType]);

  const fetchInitial = useCallback(async () => {
    setLoading(true);
    await loadPosts(selectedTagIds, feedType);
    setLoading(false);
  }, [loadPosts, selectedTagIds, feedType]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts(selectedTagIds, feedType);
    setRefreshing(false);
  }, [loadPosts, selectedTagIds, feedType]);

  const hasLoadedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true;
        fetchInitial();
      }
    }, [fetchInitial])
  );

  const handleEndReached = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadMore();
    }
  }, [loadingMore, hasMore, loadMore]);

  const handleTagFilterChange = (tagIds: number[]) => {
    setSelectedTagIds(tagIds);
    setLoading(true);
    loadPosts(tagIds, feedType).then(() => setLoading(false));
  };

  const handleFeedTypeChange = (type: 'forYou' | 'following') => {
    if (type === feedType) return;
    setFeedType(type);
    setSelectedTagIds([]);
    setLoading(true);
    loadPosts([], type).then(() => setLoading(false));
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <TagFilterBar
          selectedTagIds={selectedTagIds}
          onFilterChange={handleTagFilterChange}
        />
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </View>
    );
  }

  if (error && posts.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchInitial} accessibilityRole="button" accessibilityLabel="Retry loading feed">
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.feedToggle}>
        <TouchableOpacity
          style={[styles.feedToggleTab, feedType === 'forYou' && styles.feedToggleActive]}
          onPress={() => handleFeedTypeChange('forYou')}
          accessibilityRole="tab"
          accessibilityState={{ selected: feedType === 'forYou' }}
        >
          <Text style={[styles.feedToggleText, feedType === 'forYou' && styles.feedToggleTextActive]}>For You</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.feedToggleTab, feedType === 'following' && styles.feedToggleActive]}
          onPress={() => handleFeedTypeChange('following')}
          accessibilityRole="tab"
          accessibilityState={{ selected: feedType === 'following' }}
        >
          <Text style={[styles.feedToggleText, feedType === 'following' && styles.feedToggleTextActive]}>Following</Text>
        </TouchableOpacity>
      </View>
      <TagFilterBar
        selectedTagIds={selectedTagIds}
        onFilterChange={handleTagFilterChange}
      />
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <Post
            id={item.id}
            profilePic={item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.displayName || item.username || item.userId)}&background=random`}
            username={item.displayName || item.username || item.userId}
            postImage={getImageUrl(item.imagePath)}
            caption={item.caption}
            userId={item.userId}
            currentUserId={user?.id}
            onDeleted={handlePostDeleted}
            tags={item.tags}
            editedAt={item.editedAt}
          />
        )}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color="#FF6B35" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {selectedTagIds.length > 0 ? 'No matches' : 'No posts yet'}
            </Text>
            <Text style={styles.emptyText}>
              {selectedTagIds.length > 0
                ? 'No posts match the selected tags.'
                : 'Be the first to share a meal!'}
            </Text>
          </View>
        }
        contentContainerStyle={posts.length === 0 ? styles.emptyList : undefined}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/create-post')}
        accessibilityRole="button"
        accessibilityLabel="Create new post"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  feedToggle: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  feedToggleTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  feedToggleActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B35',
  },
  feedToggleText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999',
  },
  feedToggleTextActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: '#e74c3c', textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#FF6B35', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { paddingVertical: 20, alignItems: 'center' },
  empty: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#666', marginBottom: 8 },
  emptyText: { fontSize: 16, color: '#999' },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3,
    shadowRadius: 4, elevation: 5,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: -2 },
});
