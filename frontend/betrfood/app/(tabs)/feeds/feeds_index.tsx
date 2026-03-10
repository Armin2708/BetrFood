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
  FeedMode,
} from '../../../services/api';

// TODO: replace with real user ID from AuthContext once backend auth is wired up
const CURRENT_USER_ID = 'current-user';

export default function HomeScreen() {
  const { user } = useContext(AuthContext);

  const [feedMode, setFeedMode] = useState<FeedMode>('for_you');
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const nextCursor = useRef<string | null>(null);
  const hasMore = useRef(true);
  const isFetching = useRef(false);

  const loadFeed = useCallback(
    async (opts: {
      tagIds?: number[];
      cursor?: string | null;
      replace?: boolean;
      mode?: FeedMode;
    }) => {
      const {
        tagIds = selectedTagIds,
        cursor = null,
        replace = false,
        mode = feedMode,
      } = opts;

      if (isFetching.current) return;
      isFetching.current = true;

      try {
        const result = await fetchFeed(CURRENT_USER_ID, cursor, 10, tagIds, mode);
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
    [selectedTagIds, feedMode]
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      nextCursor.current = null;
      hasMore.current = true;
      loadFeed({ replace: true });
    }, [loadFeed])
  );

  const handleModeChange = (mode: FeedMode) => {
    if (mode === feedMode) return;
    setFeedMode(mode);
    setLoading(true);
    nextCursor.current = null;
    hasMore.current = true;
    loadFeed({ mode, replace: true });
  };

  const onRefresh = () => {
    setRefreshing(true);
    nextCursor.current = null;
    hasMore.current = true;
    loadFeed({ replace: true });
  };

  const onEndReached = () => {
    if (!hasMore.current || isFetching.current) return;
    setLoadingMore(true);
    loadFeed({ cursor: nextCursor.current });
  };

  const handleTagFilterChange = (tagIds: number[]) => {
    setSelectedTagIds(tagIds);
    setLoading(true);
    nextCursor.current = null;
    hasMore.current = true;
    loadFeed({ tagIds, replace: true });
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <View style={styles.container}>

      {/* For You / Following toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, feedMode === 'for_you' && styles.toggleButtonActive]}
          onPress={() => handleModeChange('for_you')}
        >
          <Text style={[styles.toggleText, feedMode === 'for_you' && styles.toggleTextActive]}>
            For You
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, feedMode === 'following' && styles.toggleButtonActive]}
          onPress={() => handleModeChange('following')}
        >
          <Text style={[styles.toggleText, feedMode === 'following' && styles.toggleTextActive]}>
            Following
          </Text>
        </TouchableOpacity>
      </View>

      {feedMode === 'for_you' && (
        <TagFilterBar
          selectedTagIds={selectedTagIds}
          onFilterChange={handleTagFilterChange}
        />
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() => router.push(`/feeds/post/${item.id}`)}
            >
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
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {feedMode === 'following' ? 'No posts from following' : 'Nothing here yet'}
              </Text>
              <Text style={styles.emptyText}>
                {feedMode === 'following'
                  ? 'Follow some accounts to see their posts here.'
                  : selectedTagIds.length > 0
                  ? 'Try clearing some filters to see more content.'
                  : 'Be the first to share something!'}
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
      )}

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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  toggleButtonActive: {
    borderBottomColor: '#FF6B35',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999',
  },
  toggleTextActive: {
    color: '#FF6B35',
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
