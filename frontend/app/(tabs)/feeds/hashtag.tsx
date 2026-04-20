import React, { useState, useCallback, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchPostsByHashtag,
  getAvatarUrl,
  getImageUrl,
  Post as PostType,
  Tag,
} from '../../../services/api';
import { AuthContext } from '../../../context/AuthenticationContext';
import Post from '../../../components/Post';

type SortOption = 'recent' | 'popular';

const TAG_TYPE_COLORS: Record<string, string> = {
  cuisine: '#22C55E',
  meal: '#F59E0B',
  dietary: '#3B82F6',
};

const PAGE_SIZE = 20;

export default function HashtagScreen() {
  const router = useRouter();
  const { tagId, tagName } = useLocalSearchParams<{ tagId: string; tagName?: string }>();
  const { user } = useContext(AuthContext);

  const [tag, setTag] = useState<Tag | null>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [sort, setSort] = useState<SortOption>('recent');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const parsedTagId = parseInt(tagId || '', 10);

  const loadPosts = useCallback(async (
    currentOffset: number,
    currentSort: SortOption,
    append: boolean
  ) => {
    if (isNaN(parsedTagId)) return;
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const result = await fetchPostsByHashtag(parsedTagId, currentSort, PAGE_SIZE, currentOffset);
      setTag(result.tag);
      setTotalCount(result.totalCount);
      setPosts(prev => append ? [...prev, ...result.posts] : result.posts);
      setHasMore(result.hasMore);
      setOffset(currentOffset + result.posts.length);
    } catch (err) {
      console.error('Failed to load hashtag posts:', err);
      if (!append) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [parsedTagId]);

  useEffect(() => {
    loadPosts(0, sort, false);
  }, [loadPosts, sort]);

  const handleSortChange = (newSort: SortOption) => {
    if (newSort === sort) return;
    setOffset(0);
    setSort(newSort);
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    loadPosts(offset, sort, true);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    setTotalCount(c => Math.max(0, c - 1));
  };

  const displayName = tag?.name || tagName || '';
  const color = tag ? TAG_TYPE_COLORS[tag.type] || '#0F172A' : '#0F172A';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color }]} numberOfLines={1}>
            #{displayName}
          </Text>
          <Text style={styles.headerSubtitle}>
            {totalCount} {totalCount === 1 ? 'post' : 'posts'}
          </Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      {/* Sort tabs */}
      <View style={styles.sortBar}>
        <TouchableOpacity
          style={[styles.sortTab, sort === 'recent' && styles.sortTabActive]}
          onPress={() => handleSortChange('recent')}
        >
          <Text style={[styles.sortText, sort === 'recent' && styles.sortTextActive]}>Recent</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortTab, sort === 'popular' && styles.sortTabActive]}
          onPress={() => handleSortChange('popular')}
        >
          <Text style={[styles.sortText, sort === 'popular' && styles.sortTextActive]}>Popular</Text>
        </TouchableOpacity>
      </View>

      {/* Posts */}
      {loading && posts.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          onEndReached={handleLoadMore}
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
              verified={item.verified}
              hasRecipe={!!item.recipeId || !!item.recipe}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetag-outline" size={48} color="#CCC" />
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptySubtitle}>Be the first to post with this tag</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color="#22C55E" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  headerRightSpacer: {
    width: 40,
  },
  sortBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  sortTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sortTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#22C55E',
  },
  sortText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999',
  },
  sortTextActive: {
    color: '#22C55E',
    fontWeight: '600',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  footer: { paddingVertical: 20, alignItems: 'center' },
});
