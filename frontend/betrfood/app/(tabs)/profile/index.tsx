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
  fetchDrafts,
  getImageUrl,
  UserProfile,
  Post,
} from '../../../services/api';

// TODO: replace with real user ID from AuthContext once backend auth is wired up
const CURRENT_USER_ID = 'current-user';

const { width } = Dimensions.get('window');
const ITEM_SIZE = width / 3;

type Tab = 'posts' | 'drafts' | 'collections';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const { collections } = useCollections();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [drafts, setDrafts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const nextCursor = useRef<string | null>(null);
  const hasMore = useRef(true);
  const isFetching = useRef(false);

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

  const loadDrafts = useCallback(async () => {
    try {
      const data = await fetchDrafts(CURRENT_USER_ID);
      setDrafts(data);
    } catch (e) {
      console.error('Failed to load drafts:', e);
    } finally {
      setLoadingDrafts(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoadingProfile(true);
      setLoadingPosts(true);
      setLoadingDrafts(true);
      nextCursor.current = null;
      hasMore.current = true;
      loadProfile();
      loadPosts({ replace: true });
      loadDrafts();
    }, [loadProfile, loadPosts, loadDrafts])
  );

  const onRefresh = () => {
    setRefreshing(true);
    nextCursor.current = null;
    hasMore.current = true;
    loadProfile();
    loadPosts({ replace: true });
    loadDrafts();
  };

  const onEndReached = () => {
    if (!hasMore.current || isFetching.current || activeTab !== 'posts') return;
    setLoadingMore(true);
    loadPosts({ cursor: nextCursor.current });
  };

  const formatCount = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  const displayName = profile?.displayName || profile?.username || CURRENT_USER_ID;
  const username = profile?.username || CURRENT_USER_ID;
  const bio = profile?.bio || '';
  const avatarUrl = profile?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${username}&background=random&size=150`;

  const ListHeader = (
    <View>
      <View style={styles.header}>
        {loadingProfile ? (
          <View style={[styles.avatar, styles.avatarPlaceholder]} />
        ) : (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        )}
        <View style={styles.statsRow}>
          <StatItem label="Posts" value={loadingProfile ? '—' : formatCount(profile?.postCount ?? 0)} onPress={() => {}} />
          <StatItem label="Followers" value={loadingProfile ? '—' : formatCount(profile?.followerCount ?? 0)} onPress={() => router.push('/profile/info/followersScreen')} />
          <StatItem label="Following" value={loadingProfile ? '—' : formatCount(profile?.followingCount ?? 0)} onPress={() => router.push('/profile/info/followingScreen')} />
        </View>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.displayName}>{loadingProfile ? '...' : displayName}</Text>
        <Text style={styles.usernameText}>@{loadingProfile ? '...' : username}</Text>
        {bio ? <Text style={styles.bio}>{bio}</Text> : null}
      </View>

      <Pressable style={styles.editButton} onPress={() => router.push('/profile/info/editProfile')}>
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </Pressable>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <Ionicons name="grid-outline" size={22} color={activeTab === 'posts' ? '#000' : '#999'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'drafts' && styles.tabActive]}
          onPress={() => setActiveTab('drafts')}
        >
          <Ionicons name="document-text-outline" size={22} color={activeTab === 'drafts' ? '#000' : '#999'} />
          {drafts.length > 0 && (
            <View style={styles.draftBadge}>
              <Text style={styles.draftBadgeText}>{drafts.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'collections' && styles.tabActive]}
          onPress={() => setActiveTab('collections')}
        >
          <Ionicons name="bookmark-outline" size={22} color={activeTab === 'collections' ? '#000' : '#999'} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const screenOptions = (
    <Stack.Screen
      options={{
        headerRight: () => (
          <Pressable onPress={() => router.push('/profile/settings')}>
            <Ionicons name="settings-outline" size={24} />
          </Pressable>
        ),
      }}
    />
  );

  if (activeTab === 'posts') {
    return (
      <>
        {screenOptions}
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
              <Image source={{ uri: getImageUrl(item.imagePath) }} style={styles.gridItem} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            loadingPosts ? (
              <View style={styles.center}><ActivityIndicator size="large" color="#FF6B35" /></View>
            ) : (
              <View style={styles.emptyTab}>
                <Ionicons name="camera-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No posts yet</Text>
              </View>
            )
          }
          ListFooterComponent={loadingMore ? <View style={styles.footer}><ActivityIndicator size="small" color="#FF6B35" /></View> : null}
        />
      </>
    );
  }

  // ── Drafts tab — tapping opens the draft in the create-post editor ────────

  if (activeTab === 'drafts') {
    return (
      <>
        {screenOptions}
        <FlatList
          data={drafts}
          keyExtractor={(item) => item.id}
          numColumns={3}
          ListHeaderComponent={ListHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/create-post?draftId=${item.id}`)}
              style={styles.draftGridItem}
            >
              {item.imagePath ? (
                <Image source={{ uri: getImageUrl(item.imagePath) }} style={styles.gridItem} />
              ) : item.videoPath ? (
                <View style={[styles.gridItem, styles.draftVideoThumb]}>
                  <Ionicons name="videocam" size={28} color="#fff" />
                </View>
              ) : (
                <View style={[styles.gridItem, styles.draftTextThumb]}>
                  <Ionicons name="document-text" size={28} color="#FF6B35" />
                </View>
              )}
              <View style={styles.draftLabel}>
                <Text style={styles.draftLabelText}>Tap to edit</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            loadingDrafts ? (
              <View style={styles.center}><ActivityIndicator size="large" color="#FF6B35" /></View>
            ) : (
              <View style={styles.emptyTab}>
                <Ionicons name="document-text-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No drafts</Text>
                <Text style={styles.emptySubtext}>Tap "Save Draft" when creating a post to save it here.</Text>
              </View>
            )
          }
        />
      </>
    );
  }

  // ── Collections tab ───────────────────────────────────────────────────────

  return (
    <>
      {screenOptions}
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
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
                <Text style={styles.collectionName} numberOfLines={1}>{collection.name}</Text>
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
  header: { flexDirection: 'row', padding: 20, alignItems: 'center' },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: { backgroundColor: '#eee' },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontWeight: 'bold', fontSize: 17, color: '#000' },
  statLabel: { color: '#555', fontSize: 12, marginTop: 2 },
  userInfo: { paddingHorizontal: 20, paddingBottom: 4 },
  displayName: { fontWeight: '700', fontSize: 15, color: '#000' },
  usernameText: { fontSize: 13, color: '#555', marginTop: 1 },
  bio: { fontSize: 14, color: '#333', marginTop: 6, lineHeight: 20 },
  editButton: {
    marginHorizontal: 20, marginVertical: 14, borderWidth: 1,
    borderColor: '#ccc', paddingVertical: 8, borderRadius: 6, alignItems: 'center',
  },
  editButtonText: { color: '#000', fontWeight: '500', fontSize: 14 },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#eee' },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
    borderTopWidth: 2, borderTopColor: 'transparent', position: 'relative',
  },
  tabActive: { borderTopColor: '#000' },
  draftBadge: {
    position: 'absolute', top: 6, right: '28%',
    backgroundColor: '#FF6B35', borderRadius: 8,
    minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  draftBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  gridItem: {
    width: ITEM_SIZE, height: ITEM_SIZE, backgroundColor: '#eee',
    borderWidth: 0.5, borderColor: '#fff',
  },
  draftGridItem: { position: 'relative' },
  draftVideoThumb: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#333' },
  draftTextThumb: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff5f0' },
  draftLabel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 2, alignItems: 'center',
  },
  draftLabelText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  center: { padding: 40, alignItems: 'center' },
  emptyTab: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#999' },
  emptySubtext: { fontSize: 13, color: '#bbb', textAlign: 'center', paddingHorizontal: 40 },
  footer: { paddingVertical: 20, alignItems: 'center' },
  collectionsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  collectionCard: {
    width: (width - 48) / 2, backgroundColor: '#f9f9f9', borderRadius: 10,
    borderWidth: 1, borderColor: '#eee', overflow: 'hidden',
  },
  collectionThumb: {
    width: '100%', height: 100, backgroundColor: '#fff5f0',
    justifyContent: 'center', alignItems: 'center',
  },
  collectionName: { fontWeight: '600', fontSize: 14, color: '#222', paddingHorizontal: 10, paddingTop: 8 },
  collectionCount: { fontSize: 12, color: '#999', paddingHorizontal: 10, paddingBottom: 10, marginTop: 2 },
});
