import React, { useState, useCallback, useRef, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  searchUsers,
  searchPosts,
  fetchTags,
  getAvatarUrl,
  getImageUrl,
  SearchUserResult,
  SearchFilters,
  Post as PostType,
  Tag,
} from '../../../services/api';
import { AuthContext } from '../../../context/AuthenticationContext';
import Post from '../../../components/Post';

type SearchTab = 'posts' | 'users';
type Difficulty = 'easy' | 'medium' | 'hard';

const COOK_TIME_OPTIONS: { label: string; value: number }[] = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '90 min', value: 90 },
];

const DIFFICULTY_OPTIONS: { label: string; value: Difficulty }[] = [
  { label: 'Easy', value: 'easy' },
  { label: 'Medium', value: 'medium' },
  { label: 'Hard', value: 'hard' },
];

const TAG_TYPE_COLORS: Record<string, string> = {
  cuisine: '#22C55E',
  meal: '#F59E0B',
  dietary: '#3B82F6',
};

// ── User row ─────────────────────────────────────────────────────────────────

function UserRow({ item, onPress }: { item: SearchUserResult; onPress: (id: string) => void }) {
  const avatarUri = getAvatarUrl(item.avatarUrl, item.displayName || item.username || item.id);
  const [avatarError, setAvatarError] = useState(false);
  const initial = (item.displayName || item.username || '?')[0].toUpperCase();

  return (
    <TouchableOpacity style={styles.userRow} onPress={() => onPress(item.id)} activeOpacity={0.7}>
      {avatarError ? (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarFallbackText}>{initial}</Text>
        </View>
      ) : (
        <Image
          source={{ uri: avatarUri }}
          style={styles.avatar}
          onError={() => setAvatarError(true)}
        />
      )}
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.displayName} numberOfLines={1}>
            {item.displayName || item.username || 'User'}
          </Text>
          {item.verified && (
            <Ionicons name="checkmark-circle" size={16} color="#22C55E" style={{ marginLeft: 4 }} />
          )}
        </View>
        {item.username && (
          <Text style={styles.username} numberOfLines={1}>@{item.username}</Text>
        )}
        {item.bio ? <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('posts');

  // Filter state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [selectedCookTime, setSelectedCookTime] = useState<number | null>(null);

  // Posts search state
  const [postResults, setPostResults] = useState<PostType[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsHasMore, setPostsHasMore] = useState(false);
  const [postsOffset, setPostsOffset] = useState(0);
  const [postsLoadingMore, setPostsLoadingMore] = useState(false);

  // Users search state
  const [userResults, setUserResults] = useState<SearchUserResult[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const POSTS_PAGE = 20;

  // Derived: active filter count for badge
  const activeFilterCount =
    selectedTagIds.length +
    (selectedDifficulty ? 1 : 0) +
    (selectedCookTime ? 1 : 0);

  const currentFilters: SearchFilters = {
    tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    difficulty: selectedDifficulty ?? undefined,
    cookTime: selectedCookTime ?? undefined,
  };

  // ── Tags loading ──────────────────────────────────────────────────────────

  const loadTags = useCallback(async () => {
    if (tags.length > 0) return; // already loaded
    setTagsLoading(true);
    try {
      const data = await fetchTags();
      setTags(data);
    } catch (err) {
      console.error('Failed to load tags:', err);
    } finally {
      setTagsLoading(false);
    }
  }, [tags.length]);

  const openFilterModal = () => {
    loadTags();
    setFilterModalVisible(true);
  };

  // ── Search handlers ───────────────────────────────────────────────────────

  const runPostSearch = useCallback(async (
    text: string,
    filters: SearchFilters,
    offset = 0,
    append = false
  ) => {
    if (offset === 0) setPostsLoading(true);
    else setPostsLoadingMore(true);

    try {
      const result = await searchPosts(text.trim(), POSTS_PAGE, offset, filters);
      setPostResults(prev => append ? [...prev, ...result.posts] : result.posts);
      setPostsHasMore(result.hasMore);
      setPostsOffset(offset + result.posts.length);
    } catch (err) {
      console.error('Post search error:', err);
      if (!append) setPostResults([]);
    } finally {
      setPostsLoading(false);
      setPostsLoadingMore(false);
    }
  }, []);

  const runUserSearch = useCallback(async (text: string) => {
    setUsersLoading(true);
    try {
      const users = await searchUsers(text.trim());
      setUserResults(users);
    } catch (err) {
      console.error('User search error:', err);
      setUserResults([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const triggerSearch = useCallback((text: string, filters: SearchFilters) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length === 0) {
      setPostResults([]);
      setUserResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setSearched(true);
      setPostsOffset(0);
      runPostSearch(text, filters);
      runUserSearch(text);
    }, 350);
  }, [runPostSearch, runUserSearch]);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    triggerSearch(text, currentFilters);
  }, [triggerSearch, currentFilters]);

  const handleFiltersApplied = useCallback((
    tagIds: number[],
    difficulty: Difficulty | null,
    cookTime: number | null
  ) => {
    setSelectedTagIds(tagIds);
    setSelectedDifficulty(difficulty);
    setSelectedCookTime(cookTime);
    setFilterModalVisible(false);

    const filters: SearchFilters = {
      tagIds: tagIds.length > 0 ? tagIds : undefined,
      difficulty: difficulty ?? undefined,
      cookTime: cookTime ?? undefined,
    };

    if (query.trim()) {
      setPostsOffset(0);
      runPostSearch(query, filters);
    }
  }, [query, runPostSearch]);

  const handleRemoveTagFilter = (tagId: number) => {
    const updated = selectedTagIds.filter(id => id !== tagId);
    handleFiltersApplied(updated, selectedDifficulty, selectedCookTime);
  };

  const handleRemoveDifficulty = () => {
    handleFiltersApplied(selectedTagIds, null, selectedCookTime);
  };

  const handleRemoveCookTime = () => {
    handleFiltersApplied(selectedTagIds, selectedDifficulty, null);
  };

  const handleClearAllFilters = () => {
    handleFiltersApplied([], null, null);
  };

  const handleLoadMorePosts = useCallback(() => {
    if (postsLoadingMore || !postsHasMore || !query.trim()) return;
    runPostSearch(query, currentFilters, postsOffset, true);
  }, [postsLoadingMore, postsHasMore, query, postsOffset, currentFilters, runPostSearch]);

  const handleUserPress = (userId: string) => {
    router.push(`/feeds/user-profile?userId=${userId}` as any);
  };

  const handlePostDeleted = (postId: string) => {
    setPostResults(prev => prev.filter(p => p.id !== postId));
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getTagById = (id: number) => tags.find(t => t.id === id);

  const tagsByType = tags.reduce<Record<string, Tag[]>>((acc, tag) => {
    if (!acc[tag.type]) acc[tag.type] = [];
    acc[tag.type].push(tag);
    return acc;
  }, {});

  // ── Empty states ──────────────────────────────────────────────────────────

  const renderPostsEmpty = () => {
    if (postsLoading) return null;
    if (!searched) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color="#CCC" />
          <Text style={styles.emptyTitle}>Search for recipes</Text>
          <Text style={styles.emptySubtitle}>Try "chicken pasta" or "vegan dessert"</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="restaurant-outline" size={48} color="#CCC" />
        <Text style={styles.emptyTitle}>No posts found</Text>
        <Text style={styles.emptySubtitle}>Try different keywords or fewer filters</Text>
      </View>
    );
  };

  const renderUsersEmpty = () => {
    if (usersLoading) return null;
    if (!searched) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color="#CCC" />
          <Text style={styles.emptyTitle}>Search for people</Text>
          <Text style={styles.emptySubtitle}>Find friends, chefs, and food lovers</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="person-outline" size={48} color="#CCC" />
        <Text style={styles.emptyTitle}>No users found</Text>
        <Text style={styles.emptySubtitle}>Try a different search term</Text>
      </View>
    );
  };

  // ── Active filter chips ───────────────────────────────────────────────────

  const renderActiveFilters = () => {
    if (activeFilterCount === 0 || activeTab !== 'posts') return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.activeFiltersRow}
        contentContainerStyle={styles.activeFiltersContent}
      >
        {selectedTagIds.map(id => {
          const tag = getTagById(id);
          if (!tag) return null;
          const color = TAG_TYPE_COLORS[tag.type] || '#999';
          return (
            <TouchableOpacity
              key={id}
              style={[styles.activeChip, { backgroundColor: color, borderColor: color }]}
              onPress={() => handleRemoveTagFilter(id)}
            >
              <Text style={styles.activeChipText}>{tag.name}</Text>
              <Ionicons name="close" size={12} color="#fff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          );
        })}

        {selectedDifficulty && (
          <TouchableOpacity
            style={[styles.activeChip, { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }]}
            onPress={handleRemoveDifficulty}
          >
            <Text style={styles.activeChipText}>
              {selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}
            </Text>
            <Ionicons name="close" size={12} color="#fff" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}

        {selectedCookTime && (
          <TouchableOpacity
            style={[styles.activeChip, { backgroundColor: '#F97316', borderColor: '#F97316' }]}
            onPress={handleRemoveCookTime}
          >
            <Text style={styles.activeChipText}>≤ {selectedCookTime} min</Text>
            <Ionicons name="close" size={12} color="#fff" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.clearAllChip} onPress={handleClearAllFilters}>
          <Text style={styles.clearAllText}>Clear all</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // ── Filter modal ──────────────────────────────────────────────────────────

  // Local modal state — only committed when Done is pressed
  const [modalTagIds, setModalTagIds] = useState<number[]>([]);
  const [modalDifficulty, setModalDifficulty] = useState<Difficulty | null>(null);
  const [modalCookTime, setModalCookTime] = useState<number | null>(null);

  const handleOpenModal = () => {
    setModalTagIds(selectedTagIds);
    setModalDifficulty(selectedDifficulty);
    setModalCookTime(selectedCookTime);
    openFilterModal();
  };

  const toggleModalTag = (id: number) => {
    setModalTagIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={filterModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <Pressable style={styles.modalOverlay} onPress={() => setFilterModalVisible(false)}>
        <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <View style={styles.modalHeaderRight}>
              {(modalTagIds.length > 0 || modalDifficulty || modalCookTime) && (
                <TouchableOpacity
                  onPress={() => { setModalTagIds([]); setModalDifficulty(null); setModalCookTime(null); }}
                  style={{ marginRight: 16 }}
                >
                  <Text style={styles.clearText}>Clear all</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={22} color="#000" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Difficulty */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>DIFFICULTY</Text>
              <View style={styles.chipRow}>
                {DIFFICULTY_OPTIONS.map(opt => {
                  const isSelected = modalDifficulty === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.filterChip,
                        isSelected && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
                      ]}
                      onPress={() => setModalDifficulty(isSelected ? null : opt.value)}
                    >
                      <Text style={[styles.filterChipText, isSelected && { color: '#fff' }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Cook time */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>MAX COOK TIME</Text>
              <View style={styles.chipRow}>
                {COOK_TIME_OPTIONS.map(opt => {
                  const isSelected = modalCookTime === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.filterChip,
                        isSelected && { backgroundColor: '#F97316', borderColor: '#F97316' },
                      ]}
                      onPress={() => setModalCookTime(isSelected ? null : opt.value)}
                    >
                      <Text style={[styles.filterChipText, isSelected && { color: '#fff' }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Tags by type */}
            {tagsLoading ? (
              <ActivityIndicator size="small" color="#22C55E" style={{ marginVertical: 16 }} />
            ) : (
              Object.entries(tagsByType).map(([type, typeTags]) => {
                const color = TAG_TYPE_COLORS[type] || '#999';
                return (
                  <View key={type} style={styles.filterSection}>
                    <Text style={styles.filterSectionLabel}>{type.toUpperCase()}</Text>
                    <View style={styles.chipRow}>
                      {typeTags.map(tag => {
                        const isSelected = modalTagIds.includes(tag.id);
                        return (
                          <TouchableOpacity
                            key={tag.id}
                            style={[
                              styles.filterChip,
                              isSelected && { backgroundColor: color, borderColor: color },
                            ]}
                            onPress={() => toggleModalTag(tag.id)}
                          >
                            <Text style={[styles.filterChipText, isSelected && { color: '#fff' }]}>
                              {tag.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Done button */}
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => handleFiltersApplied(modalTagIds, modalDifficulty, modalCookTime)}
          >
            <Text style={styles.doneButtonText}>
              Show Results{(modalTagIds.length > 0 || modalDifficulty || modalCookTime)
                ? ` · ${modalTagIds.length + (modalDifficulty ? 1 : 0) + (modalCookTime ? 1 : 0)} active`
                : ''}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  const isLoading = activeTab === 'posts' ? postsLoading : usersLoading;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={18} color="#999" />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={activeTab === 'posts' ? 'Search recipes, ingredients...' : 'Search users...'}
            placeholderTextColor="#999"
            value={query}
            onChangeText={handleSearch}
            autoFocus
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter button — only on Posts tab */}
        {activeTab === 'posts' && (
          <TouchableOpacity style={styles.filterButton} onPress={handleOpenModal}>
            <Ionicons name="options-outline" size={22} color={activeFilterCount > 0 ? '#22C55E' : '#000'} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>People</Text>
        </TouchableOpacity>
      </View>

      {/* Active filter chips */}
      {renderActiveFilters()}

      {/* Results */}
      {isLoading && (activeTab === 'posts' ? postResults.length === 0 : userResults.length === 0) ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : activeTab === 'posts' ? (
        <FlatList
          data={postResults}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          onEndReached={handleLoadMorePosts}
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
          ListEmptyComponent={renderPostsEmpty()}
          ListFooterComponent={
            postsLoadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color="#22C55E" />
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={userResults}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <UserRow item={item} onPress={handleUserPress} />}
          ListEmptyComponent={renderUsersEmpty()}
        />
      )}

      {renderFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  // Header
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 0,
    marginLeft: 8,
  },
  clearButton: { padding: 4 },
  filterButton: {
    marginLeft: 12,
    padding: 4,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#22C55E',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999',
  },
  tabTextActive: {
    color: '#22C55E',
    fontWeight: '600',
  },

  // Active filter chips
  activeFiltersRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  activeFiltersContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  activeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  clearAllChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clearAllText: {
    fontSize: 13,
    color: '#e74c3c',
    fontWeight: '600',
  },

  // Empty states
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#999', marginTop: 8 },

  // User row
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#F0F0F0',
  },
  avatarFallback: {
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  displayName: { fontSize: 16, fontWeight: '600', color: '#000' },
  username: { fontSize: 14, color: '#666', marginTop: 1 },
  bio: { fontSize: 13, color: '#999', marginTop: 2 },

  // Footer
  footer: { paddingVertical: 20, alignItems: 'center' },

  // Filter modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  clearText: {
    fontSize: 13,
    color: '#e74c3c',
    fontWeight: '600',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
  },
  doneButton: {
    marginTop: 16,
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
