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
import { Ionicons } from '@expo/vector-icons';
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
  getAvatarUrl,
  Post as PostType,
} from '../../../services/api';

const PAGE_LIMIT = 10;

type FeedTab = 'following' | 'community' | 'explore';

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
  const [feedType, setFeedType] = useState<FeedTab>('community');

  const loadPosts = useCallback(async (tagIds: number[] = [], feed: FeedTab = 'community') => {
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
        // Both 'community' and 'explore' show all posts for now
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

  const handleFeedTypeChange = (type: FeedTab) => {
    if (type === feedType) return;
    setFeedType(type);
    setSelectedTagIds([]);
    setLoading(true);
    loadPosts([], type).then(() => setLoading(false));
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleSearchPress = () => {
    console.log('Search pressed');
    // router.push('/search');
  };

  const TABS: { key: FeedTab; label: string }[] = [
    { key: 'following', label: 'Following' },
    { key: 'community', label: 'Community' },
    { key: 'explore', label: 'Explore' },
  ];

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
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#22C55E" colors={['#22C55E']} />
        }
        ListHeaderComponent={
          <>
            <View style={styles.feedToggle}>
              <View style={styles.feedToggleTabs}>
                {TABS.map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    style={styles.feedToggleTab}
                    onPress={() => handleFeedTypeChange(tab.key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: feedType === tab.key }}
                  >
                    <Text style={[
                      styles.feedToggleText,
                      feedType === tab.key && styles.feedToggleTextActive,
                    ]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.searchButton}
                onPress={handleSearchPress}
                accessibilityRole="button"
                accessibilityLabel="Search"
              >
                <Ionicons name="search-outline" size={19} color="#000" />
              </TouchableOpacity>
            </View>
            <TagFilterBar
              selectedTagIds={selectedTagIds}
              onFilterChange={handleTagFilterChange}
            />
          </>
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <Post
            id={item.id}
            profilePic={getAvatarUrl(item.avatarUrl, item.displayName || item.username || item.userId)}
            username={item.displayName || item.username || item.userId}
            postImage={getImageUrl(item.imagePath)}
            postImages={item.images ? item.images.map(getImageUrl) : undefined}
            caption={item.caption}
            userId={item.userId}
            currentUserId={user?.id}
            onDeleted={handlePostDeleted}
            tags={item.tags}
            editedAt={item.editedAt}
            createdAt={item.createdAt}
            initialLiked={item.liked}
            initialLikes={item.likeCount}
            mediaType={item.mediaType}
            commentCount={item.commentCount}
          />
        )}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color="#22C55E" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  feedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  feedToggleTabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  feedToggleTab: {
    paddingVertical: 12,
  },
  feedToggleText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  feedToggleTextActive: {
    color: '#22C55E',
  },
  searchButton: {
    padding: 8,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: '#e74c3c', textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#22C55E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { paddingVertical: 20, alignItems: 'center' },
  empty: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#666', marginBottom: 8 },
  emptyText: { fontSize: 16, color: '#999' },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
});
