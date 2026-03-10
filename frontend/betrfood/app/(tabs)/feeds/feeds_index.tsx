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
import { AuthContext } from '../../../context/AuthenticationContext';
import Post from '../../../components/Post';
import TagFilterBar from '../../../components/TagFilterBar';
import {
  fetchFeed,
  getImageUrl,
  Post as PostType,
} from '../../../services/api';

// TODO: replace with real user ID from AuthContext once backend auth is wired up
const CURRENT_USER_ID = 'current-user';

export default function HomeScreen() {
  const { user } = useContext(AuthContext);

  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // Pagination state
  const nextCursor = useRef<string | null>(null);
  const hasMore = useRef(true);
  // Prevent concurrent fetches
  const isFetching = useRef(false);

  // ── Fetch a page of the feed ─────────────────────────────────────────────

  const loadFeed = useCallback(
    async (opts: { tagIds?: number[]; cursor?: string | null; replace?: boolean }) => {
      const { tagIds = selectedTagIds, cursor = null, replace = false } = opts;

      if (isFetching.current) return;
      isFetching.current = true;

      try {
        const result = await fetchFeed(
          CURRENT_USER_ID,
          cursor,
          10,
          tagIds
        );

        setPosts((prev) => (replace ? result.posts : [...prev, ...result.posts]));
        nextCursor.current = result.nextCursor;
        hasMore.current = result.hasMore;
      } catch (error) {
        console.error('Failed to load feed:', error);
      } finally {
        isFetching.current = false;
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [selectedTagIds]
  );

  // ── Initial load / re-load when screen comes into focus ─────────────────

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      nextCursor.current = null;
      hasMore.current = true;
      loadFeed({ replace: true });
    }, [loadFeed])
  );

  // ── Pull-to-refresh ──────────────────────────────────────────────────────

  const onRefresh = () => {
    setRefreshing(true);
    nextCursor.current = null;
    hasMore.current = true;
    loadFeed({ replace: true });
  };

  // ── Infinite scroll ──────────────────────────────────────────────────────

  const onEndReached = () => {
    if (!hasMore.current || isFetching.current) return;
    setLoadingMore(true);
    loadFeed({ cursor: nextCursor.current });
  };

  // ── Tag filter ───────────────────────────────────────────────────────────

  const handleTagFilterChange = (tagIds: number[]) => {
    setSelectedTagIds(tagIds);
    setLoading(true);
    nextCursor.current = null;
    hasMore.current = true;
    loadFeed({ tagIds, replace: true });
  };

  // ── Post deleted locally ─────────────────────────────────────────────────

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TagFilterBar
        selectedTagIds={selectedTagIds}
        onFilterChange={handleTagFilterChange}
      />

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
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
            tags={item.tags}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {selectedTagIds.length > 0 ? 'No matching posts' : 'Nothing here yet'}
            </Text>
            <Text style={styles.emptyText}>
              {selectedTagIds.length > 0
                ? 'Try clearing some filters to see more content.'
                : 'Follow some accounts or create your first post to get started!'}
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color="#FF6B35" />
            </View>
          ) : null
        }
        contentContainerStyle={posts.length === 0 ? styles.emptyList : undefined}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/create-post')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    padding: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#555',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: -2,
  },
});
