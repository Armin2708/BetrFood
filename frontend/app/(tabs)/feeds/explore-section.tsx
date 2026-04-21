import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Post from '../../../components/Post';
import { AuthContext } from '../../../context/AuthenticationContext';
import {
  ExploreCategory,
  ExploreSection,
  ExploreSectionId,
  fetchExploreSection,
  getAvatarUrl,
  getImageUrl,
  Post as FeedPost,
} from '../../../services/api';

const PAGE_SIZE = 20;
const CATEGORY_COLORS: Record<string, string> = {
  cuisine: '#22C55E',
  meal: '#F59E0B',
  dietary: '#3B82F6',
};

const VALID_SECTIONS = new Set<ExploreSectionId>([
  'trending',
  'popular_week',
  'based_on_preferences',
  'following',
  'categories',
]);

function CategoryResultCard({ category }: { category: ExploreCategory }) {
  const router = useRouter();
  const color = CATEGORY_COLORS[category.type] || '#0F172A';

  return (
    <TouchableOpacity
      style={[styles.categoryCard, { borderColor: `${color}33` }]}
      activeOpacity={0.86}
      onPress={() =>
        router.push({
          pathname: '/feeds/hashtag',
          params: { tagId: String(category.id), tagName: category.name },
        })
      }
    >
      <View style={[styles.categoryIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name="pricetag-outline" size={20} color={color} />
      </View>
      <View style={styles.categoryCopy}>
        <Text style={styles.categoryTitle}>{category.name}</Text>
        <Text style={styles.categoryDescription} numberOfLines={2}>
          {category.description || 'Browse posts in this category.'}
        </Text>
      </View>
      <Text style={[styles.categoryCount, { color }]}>
        {category.postCount} {category.postCount === 1 ? 'post' : 'posts'}
      </Text>
    </TouchableOpacity>
  );
}

export default function ExploreSectionScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { sectionId, title } = useLocalSearchParams<{ sectionId: string; title?: string }>();

  const parsedSectionId = VALID_SECTIONS.has(sectionId as ExploreSectionId)
    ? (sectionId as ExploreSectionId)
    : 'trending';

  const [section, setSection] = useState<ExploreSection | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [categories, setCategories] = useState<ExploreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const loadSection = useCallback(
    async (currentOffset: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const result = await fetchExploreSection(parsedSectionId, PAGE_SIZE, currentOffset);
        const nextSection = result.section;
        const nextPosts = nextSection.posts || [];
        const nextCategories = nextSection.categories || [];

        setSection(nextSection);
        setPosts((prev) => (append ? [...prev, ...nextPosts] : nextPosts));
        setCategories((prev) => (append ? [...prev, ...nextCategories] : nextCategories));
        setHasMore(nextSection.hasMore);
        setOffset(currentOffset + (nextSection.type === 'categories' ? nextCategories.length : nextPosts.length));
      } catch (err: any) {
        setError(err.message || 'Failed to load section');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [parsedSectionId]
  );

  useEffect(() => {
    loadSection(0, false);
  }, [loadSection]);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    loadSection(offset, true);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  };

  const screenTitle = section?.title || title || 'Explore';
  const screenDescription = section?.description || 'Curated posts from BetrFood.';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {screenTitle}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={2}>
            {screenDescription}
          </Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      {loading && posts.length === 0 && categories.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadSection(0, false)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : section?.type === 'categories' ? (
        <FlatList
          data={categories}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.categoryList}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => <CategoryResultCard category={item} />}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#22C55E" style={styles.footer} /> : null}
        />
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
            <View style={styles.empty}>
              <Ionicons name="restaurant-outline" size={44} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptyText}>This section will fill in as more content is added.</Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#22C55E" style={styles.footer} /> : null}
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
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 2,
  },
  headerRightSpacer: { width: 40 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  categoryList: {
    padding: 16,
    gap: 12,
  },
  categoryCard: {
    minHeight: 112,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: '#F8FAFC',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCopy: {
    flex: 1,
  },
  categoryTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  categoryDescription: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: '800',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#334155',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  footer: {
    marginVertical: 18,
  },
});
