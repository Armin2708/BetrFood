import React, { useState, useCallback, useRef, useContext, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Swipeable } from 'react-native-gesture-handler';
import {
  searchUsers,
  searchPosts,
  fetchTags,
  fetchAutocompleteSuggestions,
  recordSearchQuery,
  getAvatarUrl,
  getImageUrl,
  SearchUserResult,
  SearchFilters,
  AutocompleteSuggestion,
  Post as PostType,
  Tag,
} from '../../../services/api';
import { AuthContext } from '../../../context/AuthenticationContext';
import Post from '../../../components/Post';

type SearchTab = 'posts' | 'users';
type Difficulty = 'easy' | 'medium' | 'hard';

const RECENT_SEARCHES_KEY = 'betrfood:recent_searches';
const MAX_RECENT_SEARCHES = 10;

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

const SUGGESTION_ICONS: Record<string, string> = {
  trending: 'trending-up-outline',
  tag: 'pricetag-outline',
  caption: 'document-text-outline',
};

// ── Recent searches storage helpers ──────────────────────────────────────────

async function loadRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveRecentSearch(query: string, current: string[]): Promise<string[]> {
  try {
    const trimmed = query.trim();
    if (!trimmed) return current;
    const updated = [trimmed, ...current.filter(q => q.toLowerCase() !== trimmed.toLowerCase())]
      .slice(0, MAX_RECENT_SEARCHES);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch { return current; }
}

async function clearAllRecentSearches(): Promise<void> {
  try { await AsyncStorage.removeItem(RECENT_SEARCHES_KEY); } catch {}
}

async function removeOneRecentSearch(query: string, current: string[]): Promise<string[]> {
  try {
    const updated = current.filter(q => q !== query);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    return updated;
  } catch { return current; }
}

// ── User row ──────────────────────────────────────────────────────────────────

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
  const [inputFocused, setInputFocused] = useState(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recent searches
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const POSTS_PAGE = 20;

  const activeFilterCount =
    selectedTagIds.length +
    (selectedDifficulty ? 1 : 0) +
    (selectedCookTime ? 1 : 0);

  const currentFilters: SearchFilters = {
    tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    difficulty: selectedDifficulty ?? undefined,
    cookTime: selectedCookTime ?? undefined,
  };

  const showRecentSearches = inputFocused && query.trim().length === 0 && recentSearches.length > 0 && !showSuggestions;

  // ── Load recent searches on mount ────────────────────────────────────────

  useEffect(() => {
    loadRecentSearches().then(setRecentSearches);
  }, []);

  // ── Focus/blur handling ───────────────────────────────────────────────────
  // Delay blur by 200ms so taps on the recent searches panel register first

  const handleInputFocus = useCallback(() => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    setInputFocused(true);
    if (query.trim().length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [query, suggestions]);

  const handleInputBlur = useCallback(() => {
    blurTimerRef.current = setTimeout(() => {
      setInputFocused(false);
    }, 200);
  }, []);

  // ── Tags loading ──────────────────────────────────────────────────────────

  const loadTags = useCallback(async () => {
    if (tags.length > 0) return;
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

  // ── Autocomplete ──────────────────────────────────────────────────────────

  const fetchSuggestions = useCallback(async (text: string) => {
    if (text.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const result = await fetchAutocompleteSuggestions(text.trim());
      setSuggestions(result.suggestions);
      setShowSuggestions(result.suggestions.length > 0);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  const handleSuggestionTap = useCallback((suggestion: AutocompleteSuggestion) => {
    const text = suggestion.text;
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    setQuery(text);
    setShowSuggestions(false);
    setSuggestions([]);
    setInputFocused(false);
    recordSearchQuery(text);
    saveRecentSearch(text, recentSearches).then(setRecentSearches);
    setSearched(true);
    setPostsOffset(0);
    runPostSearch(text, currentFilters);
    runUserSearch(text);
  }, [currentFilters, recentSearches]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Recent search handlers ────────────────────────────────────────────────

  const executeSearch = useCallback((text: string, filters: SearchFilters) => {
    setSearched(true);
    setPostsOffset(0);
    recordSearchQuery(text.trim());
    runPostSearch(text, filters);
    runUserSearch(text);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRecentSearchTap = useCallback((text: string) => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    setQuery(text);
    setShowSuggestions(false);
    setSuggestions([]);
    setInputFocused(false);
    saveRecentSearch(text, recentSearches).then(setRecentSearches);
    executeSearch(text, currentFilters);
  }, [recentSearches, currentFilters, executeSearch]);

  const handleRemoveRecentSearch = useCallback(async (text: string) => {
    const updated = await removeOneRecentSearch(text, recentSearches);
    setRecentSearches(updated);
  }, [recentSearches]);

  const handleClearAllRecent = useCallback(() => {
    Alert.alert(
      'Clear search history',
      'Are you sure you want to clear all recent searches?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAllRecentSearches();
            setRecentSearches([]);
          },
        },
      ]
    );
  }, []);

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
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (text.trim().length === 0) {
      setPostResults([]);
      setUserResults([]);
      setSearched(false);
      return;
    }
    searchDebounceRef.current = setTimeout(() => {
      setSearched(true);
      setPostsOffset(0);
      recordSearchQuery(text.trim());
      saveRecentSearch(text.trim(), recentSearches).then(setRecentSearches);
      runPostSearch(text, filters);
      runUserSearch(text);
    }, 350);
  }, [runPostSearch, runUserSearch, recentSearches]);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (autocompleteDebounceRef.current) clearTimeout(autocompleteDebounceRef.current);
    if (text.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
    } else {
      autocompleteDebounceRef.current = setTimeout(() => {
        fetchSuggestions(text);
      }, 200);
    }
    triggerSearch(text, currentFilters);
  }, [triggerSearch, currentFilters, fetchSuggestions]);

  const handleFiltersApplied = useCallback((
    tagIds: number[],
    difficulty: Difficulty | null,
    cookTime: number | null
  ) => {
    setSelectedTagIds(tagIds);
    setSelectedDifficulty(difficulty);
    setSelectedCookTime(cookTime);
    setFilterModalVisible(false);
    setShowSuggestions(false);
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

  const handleRemoveDifficulty = () => handleFiltersApplied(selectedTagIds, null, selectedCookTime);
  const handleRemoveCookTime = () => handleFiltersApplied(selectedTagIds, selectedDifficulty, null);
  const handleClearAllFilters = () => handleFiltersApplied([], null, null);

  const handleLoadMorePosts = useCallback(() => {
    if (postsLoadingMore || !postsHasMore || !query.trim()) return;
    runPostSearch(query, currentFilters, postsOffset, true);
  }, [postsLoadingMore, postsHasMore, query, postsOffset, currentFilters, runPostSearch]);

  const handleUserPress = (userId: string) => router.push(`/feeds/user-profile?userId=${userId}` as any);
  const handlePostDeleted = (postId: string) => setPostResults(prev => prev.filter(p => p.id !== postId));

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

  // ── Recent searches panel ─────────────────────────────────────────────────

  const renderSwipeDeleteAction = (item: string) => (
    <TouchableOpacity
      style={styles.swipeDeleteAction}
      onPress={() => handleRemoveRecentSearch(item)}
    >
      <Ionicons name="trash-outline" size={20} color="#fff" />
    </TouchableOpacity>
  );

  const renderRecentSearches = () => {
    if (!showRecentSearches) return null;
    return (
      <View style={styles.recentSearchesPanel}>
        <View style={styles.recentSearchesHeader}>
          <Text style={styles.recentSearchesTitle}>Recent</Text>
          <TouchableOpacity onPress={handleClearAllRecent}>
            <Text style={styles.recentSearchesClearAll}>Clear all</Text>
          </TouchableOpacity>
        </View>
        {recentSearches.map((item, index) => (
          <Swipeable
            key={`recent-${index}`}
            renderRightActions={() => renderSwipeDeleteAction(item)}
            overshootRight={false}
          >
            <TouchableOpacity
              style={[
                styles.recentSearchRow,
                index < recentSearches.length - 1 && styles.recentSearchRowBorder,
              ]}
              onPress={() => handleRecentSearchTap(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={16} color="#94A3B8" style={styles.recentSearchIcon} />
              <Text style={styles.recentSearchText} numberOfLines={1}>{item}</Text>
              <TouchableOpacity
                onPress={() => handleRemoveRecentSearch(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.recentSearchRemove}
              >
                <Ionicons name="close" size={16} color="#CBD5E1" />
              </TouchableOpacity>
            </TouchableOpacity>
          </Swipeable>
        ))}
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

  // ── Autocomplete dropdown ─────────────────────────────────────────────────

  const renderAutocomplete = () => {
    if (!showSuggestions || suggestions.length === 0) return null;
    return (
      <View style={styles.autocompleteDropdown}>
        {suggestions.map((suggestion, index) => {
          const iconName = SUGGESTION_ICONS[suggestion.type] as any || 'search-outline';
          const iconColor = suggestion.type === 'tag' && suggestion.tagType
            ? TAG_TYPE_COLORS[suggestion.tagType] || '#999'
            : suggestion.type === 'trending' ? '#F59E0B' : '#94A3B8';
          return (
            <TouchableOpacity
              key={`${suggestion.type}-${index}`}
              style={[styles.suggestionRow, index < suggestions.length - 1 && styles.suggestionRowBorder]}
              onPress={() => handleSuggestionTap(suggestion)}
              activeOpacity={0.7}
            >
              <Ionicons name={iconName} size={16} color={iconColor} style={styles.suggestionIcon} />
              <Text style={styles.suggestionText} numberOfLines={1}>{suggestion.text}</Text>
              {suggestion.type === 'tag' && suggestion.tagType && (
                <View style={[styles.suggestionBadge, { backgroundColor: TAG_TYPE_COLORS[suggestion.tagType] || '#999' }]}>
                  <Text style={styles.suggestionBadgeText}>{suggestion.tagType}</Text>
                </View>
              )}
              <Ionicons name="arrow-up-back-outline" size={14} color="#CBD5E1" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ── Filter modal ──────────────────────────────────────────────────────────

  const [modalTagIds, setModalTagIds] = useState<number[]>([]);
  const [modalDifficulty, setModalDifficulty] = useState<Difficulty | null>(null);
  const [modalCookTime, setModalCookTime] = useState<number | null>(null);

  const handleOpenModal = () => {
    setModalTagIds(selectedTagIds);
    setModalDifficulty(selectedDifficulty);
    setModalCookTime(selectedCookTime);
    setShowSuggestions(false);
    openFilterModal();
  };

  const toggleModalTag = (id: number) => {
    setModalTagIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
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
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>DIFFICULTY</Text>
              <View style={styles.chipRow}>
                {DIFFICULTY_OPTIONS.map(opt => {
                  const isSelected = modalDifficulty === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.filterChip, isSelected && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' }]}
                      onPress={() => setModalDifficulty(isSelected ? null : opt.value)}
                    >
                      <Text style={[styles.filterChipText, isSelected && { color: '#fff' }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>MAX COOK TIME</Text>
              <View style={styles.chipRow}>
                {COOK_TIME_OPTIONS.map(opt => {
                  const isSelected = modalCookTime === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.filterChip, isSelected && { backgroundColor: '#F97316', borderColor: '#F97316' }]}
                      onPress={() => setModalCookTime(isSelected ? null : opt.value)}
                    >
                      <Text style={[styles.filterChipText, isSelected && { color: '#fff' }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
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
                            style={[styles.filterChip, isSelected && { backgroundColor: color, borderColor: color }]}
                            onPress={() => toggleModalTag(tag.id)}
                          >
                            <Text style={[styles.filterChipText, isSelected && { color: '#fff' }]}>{tag.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
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
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setPostResults([]);
                setUserResults([]);
                setSuggestions([]);
                setShowSuggestions(false);
                setSearched(false);
              }}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
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

      {/* Recent searches */}
      {renderRecentSearches()}

      {/* Autocomplete dropdown */}
      {renderAutocomplete()}

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => { setActiveTab('posts'); setShowSuggestions(false); }}
        >
          <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => { setActiveTab('users'); setShowSuggestions(false); }}
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
          onScrollBeginDrag={() => { setShowSuggestions(false); setInputFocused(false); }}
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
          onScrollBeginDrag={() => { setShowSuggestions(false); setInputFocused(false); }}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
    zIndex: 10,
  },
  backButton: { padding: 8, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 16, color: '#000', paddingVertical: 0, marginLeft: 8 },
  clearButton: { padding: 4 },
  filterButton: { marginLeft: 12, padding: 4, position: 'relative' },
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
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  recentSearchesPanel: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    zIndex: 9,
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  recentSearchesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  recentSearchesClearAll: { fontSize: 13, fontWeight: '600', color: '#e74c3c' },
  recentSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  recentSearchRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  recentSearchIcon: { marginRight: 12, width: 16 },
  recentSearchText: { flex: 1, fontSize: 15, color: '#0F172A' },
  recentSearchRemove: { padding: 4, marginLeft: 8 },
  swipeDeleteAction: {
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
  },
  autocompleteDropdown: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    zIndex: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  suggestionRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  suggestionIcon: { marginRight: 12, width: 16 },
  suggestionText: { flex: 1, fontSize: 15, color: '#0F172A' },
  suggestionBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  suggestionBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff', textTransform: 'capitalize' },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#22C55E' },
  tabText: { fontSize: 15, fontWeight: '500', color: '#999' },
  tabTextActive: { color: '#22C55E', fontWeight: '600' },
  activeFiltersRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5E5' },
  activeFiltersContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  activeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
  activeChipText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  clearAllChip: { paddingHorizontal: 10, paddingVertical: 5 },
  clearAllText: { fontSize: 13, color: '#e74c3c', fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#999', marginTop: 8 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12, backgroundColor: '#F0F0F0' },
  avatarFallback: { backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' },
  avatarFallbackText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  displayName: { fontSize: 16, fontWeight: '600', color: '#000' },
  username: { fontSize: 14, color: '#666', marginTop: 1 },
  bio: { fontSize: 13, color: '#999', marginTop: 2 },
  footer: { paddingVertical: 20, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  clearText: { fontSize: 13, color: '#e74c3c', fontWeight: '600' },
  filterSection: { marginBottom: 20 },
  filterSectionLabel: { fontSize: 12, fontWeight: '700', color: '#999', letterSpacing: 0.8, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  filterChipText: { fontSize: 13, fontWeight: '500', color: '#555' },
  doneButton: { marginTop: 16, backgroundColor: '#22C55E', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  doneButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
