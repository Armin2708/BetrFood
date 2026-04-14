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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  searchUsers,
  searchPosts,
  getAvatarUrl,
  getImageUrl,
  SearchUserResult,
  Post as PostType,
} from '../../../services/api';
import { AuthContext } from '../../../context/AuthenticationContext';
import Post from '../../../components/Post';

type SearchTab = 'posts' | 'users';

// ── User row ────────────────────────────────────────────────────────────────

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

// ── Main screen ─────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('posts');

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

  // ── Search handlers ────────────────────────────────────────────────────────

  const runPostSearch = useCallback(async (text: string, offset = 0, append = false) => {
    if (offset === 0) setPostsLoading(true);
    else setPostsLoadingMore(true);

    try {
      const result = await searchPosts(text.trim(), POSTS_PAGE, offset);
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

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
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
      runPostSearch(text);
      runUserSearch(text);
    }, 350);
  }, [runPostSearch, runUserSearch]);

  const handleLoadMorePosts = useCallback(() => {
    if (postsLoadingMore || !postsHasMore || !query.trim()) return;
    runPostSearch(query, postsOffset, true);
  }, [postsLoadingMore, postsHasMore, query, postsOffset, runPostSearch]);

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
  };

  const handleUserPress = (userId: string) => {
    router.push(`/feeds/user-profile?userId=${userId}` as any);
  };

  const handlePostDeleted = (postId: string) => {
    setPostResults(prev => prev.filter(p => p.id !== postId));
  };

  // ── Empty states ────────────────────────────────────────────────────────────

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
        <Text style={styles.emptySubtitle}>Try different keywords</Text>
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

  // ── Render ──────────────────────────────────────────────────────────────────

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
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => handleTabChange('posts')}
        >
          <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
            Posts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => handleTabChange('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
            People
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading spinner (initial load only) */}
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
  footer: { paddingVertical: 20, alignItems: 'center' },
});
