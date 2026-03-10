import React, { useState, useCallback, useContext, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  FlatList,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { AuthContext } from '../../../context/AuthenticationContext';
import { useCollections } from '../../../context/CollectionsContext';
import {
  fetchUserProfile,
  fetchUserPosts,
  getImageUrl,
  UserProfile,
  Post,
} from '../../../services/api';

// TODO: replace with real user ID from AuthContext once backend auth is wired up
const CURRENT_USER_ID = 'current-user';

const { width } = Dimensions.get('window');
const ITEM_SIZE = width / 3;

type Tab = 'posts' | 'collections';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { collections } = useCollections();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const nextCursor = useRef<string | null>(null);
  const hasMore = useRef(true);
  const isFetching = useRef(false);

  // ── Load profile ──────────────────────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    try {
      const data = await fetchUserProfile(CURRENT_USER_ID);
      setProfile(data);
    } catch (e) {
      console.error('Failed to load profile:', e);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  // ── Load posts ────────────────────────────────────────────────────────────

  const loadPosts = useCallback(async (opts: { cursor?: string | null; replace?: boolean } = {}) => {
    const { cursor = null, replace = false } = opts;
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      const result = await fetchUserPosts(CURRENT_USER_ID, cursor, 12);
      setPosts((prev) => (replace ? result.posts : [...prev, ...result.posts]));
      nextCursor.current = result.nextCursor;
      hasMore.current = result.hasMore;
    } catch (e) {
      console.error('Failed to load user posts:', e);
    } finally {
      isFetching.current = false;
      setLoadingPosts(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  // ── Focus effect ──────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      setLoadingProfile(true);
      setLoadingPosts(true);
      nextCursor.current = null;
      hasMore.current = true;
      loadProfile();
      loadPosts({ replace: true });
    }, [loadProfile, loadPosts])
  );

  // ── Refresh ───────────────────────────────────────────────────────────────

  const onRefresh = () => {
    setRefreshing(true);
    nextCursor.current = null;
    hasMore.current = true;
    loadProfile();
    loadPosts({ replace: true });
  };

  // ── Infinite scroll for posts ─────────────────────────────────────────────

  const onEndReached = () => {
    if (!hasMore.current || isFetching.current || activeTab !== 'posts') return;
    setLoadingMore(true);
    loadPosts({ cursor: nextCursor.current });
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const formatCount = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  const displayName = profile?.displayName || profile?.username || CURRENT_USER_ID;
  const username = profile?.username || CURRENT_USER_ID;
  const bio = profile?.bio || '';
  const avatarUrl = profile?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${username}&background=random&size=150`;

  // ── Render header (shared across both tabs) ───────────────────────────────

  const ListHeader = (
    <View>
      {/* Profile header */}
      <View style={styles.header}>
        {loadingProfile ? (
          <View style={[styles.avatar, styles.avatarPlaceholder]} />
        ) : (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        )}

        <View style={styles.statsRow}>
          <StatItem
            label="Posts"
            value={loadingProfile ? '—' : formatCount(profile?.postCount ?? 0)}
            onPress={() => {}}
          />
          <StatItem
            label="Followers"
            value={loadingProfile ? '—' : formatCount(profile?.followerCount ?? 0)}
            onPress={() => router.push('/profile/info/followersScreen')}
          />
          <StatItem
            label="Following"
            value={loadingProfile ? '—' : formatCount(profile?.followingCount ?? 0)}
            onPress={() => router.push('/profile/info/followingScreen')}
          />
        </View>
      </View>

      {/* Display name + bio */}
      <View style={styles.userInfo}>
        <Text style={styles.displayName}>{loadingProfile ? '...' : displayName}</Text>
        <Text style={styles.usernameText}>@{loadingProfile ? '...' : username}</Text>
        {bio ? <Text style={styles.bio}>{bio}</Text> : null}
      </View>

      {/* Edit profile button */}
      <Pressable style={styles.editButton} onPress={() => router.push('/profile/info/editProfile')}>
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </Pressable>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <Ionicons
            name="grid-outline"
            size={22}
            color={activeTab === 'posts' ? '#000' : '#999'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'collections' && styles.tabActive]}
          onPress={() => setActiveTab('collections')}
        >
          <Ionicons
            name="bookmark-outline"
            size={22}
            color={activeTab === 'collections' ? '#000' : '#999'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Posts tab ─────────────────────────────────────────────────────────────

  if (activeTab === 'posts') {
    return (
      <>
        <Stack.Screen
          options={{
            headerRight: () => (
              <Pressable onPress={() => router.push('/profile/settings')}>
                <Ionicons name="settings-outline" size={24} />
              </Pressable>
            ),
          }}
        />
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          numColumns={3}
          ListHeaderComponent={ListHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/feeds/post/${item.id}`)}>
              <Image
                source={{ uri: getImageUrl(item.imagePath) }}
                style={styles.gridItem}
              />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            loadingPosts ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color="#FF6B35" />
              </View>
            ) : (
              <View style={styles.emptyTab}>
                <Ionicons name="camera-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No posts yet</Text>
              </View>
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color="#FF6B35" />
              </View>
            ) : null
          }
        />
      </>
    );
  }

  // ── Collections tab ───────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/profile/settings')}>
              <Ionicons name="settings-outline" size={24} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {ListHeader}
        {collections.length === 0 ? (
          <View style={styles.emptyTab}>
            <Ionicons name="bookmark-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No collections yet</Text>
            <Text style={styles.emptySubtext}>Save posts to collections to see them here.</Text>
          </View>
        ) : (
          <View style={styles.collectionsGrid}>
            {collections.map((collection) => (
              <TouchableOpacity key={collection.id} style={styles.collectionCard}>
                <View style={styles.collectionThumb}>
                  <Ionicons name="bookmark" size={28} color="#FF6B35" />
                </View>
                <Text style={styles.collectionName} numberOfLines={1}>
                  {collection.name}
                </Text>
                <Text style={styles.collectionCount}>
                  {collection.posts.length} {collection.posts.length === 1 ? 'post' : 'posts'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

function StatItem({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable style={styles.statItem} onPress={onPress}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    backgroundColor: '#eee',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontWeight: 'bold',
    fontSize: 17,
    color: '#000',
  },
  statLabel: {
    color: '#555',
    fontSize: 12,
    marginTop: 2,
  },
  userInfo: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  displayName: {
    fontWeight: '700',
    fontSize: 15,
    color: '#000',
  },
  usernameText: {
    fontSize: 13,
    color: '#555',
    marginTop: 1,
  },
  bio: {
    fontSize: 14,
    color: '#333',
    marginTop: 6,
    lineHeight: 20,
  },
  editButton: {
    marginHorizontal: 20,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#000',
    fontWeight: '500',
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: 'transparent',
  },
  tabActive: {
    borderTopColor: '#000',
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    backgroundColor: '#eee',
    borderWidth: 0.5,
    borderColor: '#fff',
  },
  center: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTab: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#bbb',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  collectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  collectionCard: {
    width: (width - 48) / 2,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  collectionThumb: {
    width: '100%',
    height: 100,
    backgroundColor: '#fff5f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectionName: {
    fontWeight: '600',
    fontSize: 14,
    color: '#222',
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  collectionCount: {
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 10,
    paddingBottom: 10,
    marginTop: 2,
  },
});
