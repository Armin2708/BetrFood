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
import { usePantry } from '../../../context/PantryContext';
import { matchRecipeToPantry } from '../../../utils/pantryMatcher';
import {
  fetchPosts,
  fetchPostsByTags,
  fetchFollowingFeed,
  fetchRecipe,
  getImageUrl,
  getAvatarUrl,
  Post as PostType,
  Recipe,
} from '../../../services/api';

const PAGE_LIMIT = 10;

type FeedTab = 'following' | 'community' | 'explore';

// Post enriched with optional pantry match data
type PostWithMatch = PostType & {
  _recipe?: Recipe | null;
  _matchedCount?: number;
  _missingCount?: number;
  _isMatch?: boolean;
};

export default function HomeScreen() {
  const { user } = useContext(AuthContext);
  const { items: pantryItems } = usePantry();

  const [posts, setPosts] = useState<PostWithMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [feedType, setFeedType] = useState<FeedTab>('community');
  const [pantryFilterActive, setPantryFilterActive] = useState(false);

  // ── Pantry-match enrichment ─────────────────────────────────────────────────
  // Fetches recipes for posts that have a recipeId and computes match data.
  // Runs in the background after posts load — doesn't block rendering.
  const enrichWithPantryMatch = useCallback(
    async (rawPosts: PostType[]): Promise<PostWithMatch[]> => {
      if (pantryItems.length === 0) return rawPosts;

      const enriched = await Promise.all(
        rawPosts.map(async (post): Promise<PostWithMatch> => {
          // Only fetch recipe if the post has one
          if (!post.recipeId && !post.recipe) return post;

          try {
            const recipe = post.recipe ?? (await fetchRecipe(post.id));
            const ingredientNames = (recipe.ingredients ?? []).map((i) => i.name);
            const result = matchRecipeToPantry(ingredientNames, pantryItems);
            return {
              ...post,
              _recipe: recipe,
              _matchedCount: result.matched,
              _missingCount: result.missing,
              _isMatch: result.isMatch,
            };
          } catch {
            return post;
          }
        })
      );

      return enriched;
    },
    [pantryItems]
  );

  // ── Feed loading ────────────────────────────────────────────────────────────

  const loadPosts = useCallback(
    async (tagIds: number[] = [], feed: FeedTab = 'community') => {
      setError(null);
      try {
        let rawPosts: PostType[];
        let cursor: string | null = null;
        let more = false;

        if (tagIds.length > 0) {
          rawPosts = await fetchPostsByTags(tagIds);
          more = false;
        } else if (feed === 'following') {
          const data = await fetchFollowingFeed(null, PAGE_LIMIT);
          rawPosts = data.posts;
          cursor = data.nextCursor;
          more = data.hasMore;
        } else {
          const data = await fetchPosts(null, PAGE_LIMIT);
          rawPosts = data.posts;
          cursor = data.nextCursor;
          more = data.hasMore;
        }

        const enriched = await enrichWithPantryMatch(rawPosts);
        setPosts(enriched);
        setNextCursor(cursor);
        setHasMore(more);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      }
    },
    [enrichWithPantryMatch]
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !nextCursor || selectedTagIds.length > 0) return;
    setLoadingMore(true);
    try {
      const data =
        feedType === 'following'
          ? await fetchFollowingFeed(nextCursor, PAGE_LIMIT)
          : await fetchPosts(nextCursor, PAGE_LIMIT);

      const enriched = await enrichWithPantryMatch(data.posts);
      setPosts((prev) => [...prev, ...enriched]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err: any) {
      setError(err.message || 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, nextCursor, selectedTagIds, feedType, enrichWithPantryMatch]);

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
    if (!loadingMore && hasMore) loadMore();
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
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleSearchPress = () => {
    console.log('Search pressed');
  };

  // ── Pantry filter ───────────────────────────────────────────────────────────
  // When pantry filter is active, only show posts that are pantry matches.
  // Posts without a recipe are hidden in this mode.
  const displayedPosts = pantryFilterActive
    ? posts.filter((p) => p._isMatch === true)
    : posts;

  // ── Tabs ────────────────────────────────────────────────────────────────────

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
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchInitial}
          accessibilityRole="button"
          accessibilityLabel="Retry loading feed"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={displayedPosts}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#22C55E"
            colors={['#22C55E']}
          />
        }
        ListHeaderComponent={
          <>
            {/* Feed type tabs + search */}
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
                    <Text
                      style={[
                        styles.feedToggleText,
                        feedType === tab.key && styles.feedToggleTextActive,
                      ]}
                    >
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

            {/* Tag filter bar */}
            <TagFilterBar
              selectedTagIds={selectedTagIds}
              onFilterChange={handleTagFilterChange}
            />

            {/* Pantry filter toggle */}
            {pantryItems.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.pantryFilterBar,
                  pantryFilterActive && styles.pantryFilterBarActive,
                ]}
                onPress={() => setPantryFilterActive((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={
                  pantryFilterActive
                    ? 'Showing recipes matching your pantry. Tap to show all.'
                    : 'Tap to show only recipes matching your pantry'
                }
                accessibilityState={{ selected: pantryFilterActive }}
              >
                <Ionicons
                  name="basket-outline"
                  size={16}
                  color={pantryFilterActive ? '#fff' : '#22C55E'}
                />
                <Text
                  style={[
                    styles.pantryFilterText,
                    pantryFilterActive && styles.pantryFilterTextActive,
                  ]}
                >
                  {pantryFilterActive
                    ? 'Showing pantry matches'
                    : 'Filter by pantry'}
                </Text>
                {pantryFilterActive && (
                  <Ionicons name="close-circle" size={16} color="#fff" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
            )}
          </>
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <Post
            id={item.id}
            profilePic={getAvatarUrl(
              item.avatarUrl,
              item.displayName || item.username || item.userId
            )}
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
            pantryMatchedCount={item._matchedCount}
            pantryMissingCount={item._missingCount}
            isPantryMatch={item._isMatch}
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
              {pantryFilterActive
                ? 'No pantry matches'
                : selectedTagIds.length > 0
                ? 'No matches'
                : 'No posts yet'}
            </Text>
            <Text style={styles.emptyText}>
              {pantryFilterActive
                ? 'No recipes in the feed can be made with your current pantry.'
                : selectedTagIds.length > 0
                ? 'No posts match the selected tags.'
                : 'Be the first to share a meal!'}
            </Text>
          </View>
        }
        contentContainerStyle={
          displayedPosts.length === 0 ? styles.emptyList : undefined
        }
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
  // Pantry filter toggle bar
  pantryFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 12,
    marginVertical: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#22C55E',
    alignSelf: 'flex-start',
  },
  pantryFilterBarActive: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  pantryFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#22C55E',
  },
  pantryFilterTextActive: {
    color: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { paddingVertical: 20, alignItems: 'center' },
  empty: { alignItems: 'center', padding: 40 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyText: { fontSize: 16, color: '#999' },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
});
