import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  ExploreCategory,
  ExploreSection,
  ExploreSectionId,
  fetchExploreSection,
  getImageUrl,
  Post,
} from '../services/api';

const SECTION_IDS: ExploreSectionId[] = [
  'trending',
  'popular_week',
  'based_on_preferences',
  'following',
  'categories',
];

const CATEGORY_COLORS: Record<string, string> = {
  cuisine: '#22C55E',
  meal: '#F59E0B',
  dietary: '#3B82F6',
};

function ExplorePostCard({ post }: { post: Post }) {
  const title = post.caption?.trim() || 'Untitled post';

  return (
    <TouchableOpacity
      style={styles.postCard}
      activeOpacity={0.86}
      onPress={() => router.push(`/post/${post.id}`)}
    >
      <Image source={{ uri: getImageUrl(post.imagePath) }} style={styles.postImage} />
      <View style={styles.postOverlay}>
        <Text style={styles.postTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.postMeta} numberOfLines={1}>
          {post.displayName || post.username || 'BetrFood creator'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function CategoryCard({ category }: { category: ExploreCategory }) {
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
      <Text style={styles.categoryTitle} numberOfLines={1}>
        {category.name}
      </Text>
      <Text style={styles.categoryDescription} numberOfLines={2}>
        {category.description || `${category.postCount} posts to explore`}
      </Text>
      <Text style={[styles.categoryCount, { color }]}>
        {category.postCount} {category.postCount === 1 ? 'post' : 'posts'}
      </Text>
    </TouchableOpacity>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionDescription}>Loading curated picks...</Text>
        </View>
      </View>
      <View style={styles.skeletonRow}>
        {[0, 1, 2].map((item) => (
          <View key={item} style={styles.skeletonCard} />
        ))}
      </View>
    </View>
  );
}

function EmptySection({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionDescription}>{description}</Text>
        </View>
      </View>
      <View style={styles.emptySection}>
        <Ionicons name="restaurant-outline" size={22} color="#94A3B8" />
        <Text style={styles.emptyText}>Nothing here yet. New posts will appear as your team adds content.</Text>
      </View>
    </View>
  );
}

function ExploreCarousel({ section }: { section: ExploreSection }) {
  const hasItems =
    section.type === 'categories'
      ? (section.categories?.length || 0) > 0
      : (section.posts?.length || 0) > 0;

  if (!hasItems) {
    return <EmptySection title={section.title} description={section.description} />;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionDescription}>{section.description}</Text>
        </View>
        <TouchableOpacity
          style={styles.seeAllButton}
          onPress={() =>
            router.push({
              pathname: '/feeds/explore-section',
              params: { sectionId: section.id, title: section.title },
            })
          }
        >
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={16} color="#22C55E" />
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        data={section.type === 'categories' ? section.categories : section.posts}
        keyExtractor={(item) => `${section.id}-${item.id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContent}
        renderItem={({ item }) =>
          section.type === 'categories' ? (
            <CategoryCard category={item as ExploreCategory} />
          ) : (
            <ExplorePostCard post={item as Post} />
          )
        }
      />
    </View>
  );
}

export default function ExploreSections() {
  const [sections, setSections] = useState<Partial<Record<ExploreSectionId, ExploreSection>>>({});
  const [loadingSections, setLoadingSections] = useState<Set<ExploreSectionId>>(new Set(SECTION_IDS));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSections = useCallback(async () => {
    setError(null);
    setLoadingSections(new Set(SECTION_IDS));
    setSections({});

    for (const sectionId of SECTION_IDS) {
      try {
        const result = await fetchExploreSection(sectionId, 10, 0);
        setSections((prev) => ({ ...prev, [sectionId]: result.section }));
      } catch (err: any) {
        setError(err.message || 'Failed to load Explore');
      } finally {
        setLoadingSections((prev) => {
          const next = new Set(prev);
          next.delete(sectionId);
          return next;
        });
      }
    }
  }, []);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadSections();
    setRefreshing(false);
  }, [loadSections]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#22C55E" colors={['#22C55E']} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.heroKicker}>Explore</Text>
        <Text style={styles.heroTitle}>Find your next crave-worthy idea</Text>
        <Text style={styles.heroText}>
          Trending recipes, weekly favorites, preference picks, creators you follow, and categories in one place.
        </Text>
      </View>

      {error ? (
        <TouchableOpacity style={styles.errorBox} onPress={loadSections}>
          <Ionicons name="refresh-outline" size={18} color="#B91C1C" />
          <Text style={styles.errorText}>{error}. Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      {SECTION_IDS.map((sectionId) => {
        const section = sections[sectionId];
        if (section) return <ExploreCarousel key={sectionId} section={section} />;

        const title = sectionId
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        return loadingSections.has(sectionId) ? <SectionSkeleton key={sectionId} title={title} /> : null;
      })}

      {loadingSections.size > 0 ? (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color="#22C55E" />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingBottom: 32 },
  hero: {
    margin: 16,
    padding: 20,
    borderRadius: 28,
    backgroundColor: '#0F172A',
  },
  heroKicker: {
    color: '#86EFAC',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '800',
    marginTop: 8,
  },
  heroText: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  section: { marginTop: 8, marginBottom: 18 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 12,
  },
  sectionHeaderText: { flex: 1 },
  sectionTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionDescription: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingVertical: 6,
  },
  seeAllText: {
    color: '#22C55E',
    fontSize: 13,
    fontWeight: '800',
  },
  carouselContent: {
    paddingLeft: 16,
    paddingRight: 8,
    gap: 12,
  },
  postCard: {
    width: 180,
    height: 228,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
  },
  postOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  postTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  postMeta: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 4,
  },
  categoryCard: {
    width: 170,
    minHeight: 150,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: '#F8FAFC',
    padding: 14,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
    marginTop: 5,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
  },
  skeletonCard: {
    width: 180,
    height: 228,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
  },
  emptySection: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 18,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    flex: 1,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
  },
  errorBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingFooter: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
