import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Pressable,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchUserProfile,
  fetchUserPosts,
  fetchFollowStatus,
  followUser,
  unfollowUser,
  getImageUrl,
  UserProfile,
  Post,
} from '../../services/api';

// TODO: replace with real user ID from AuthContext once backend auth is wired up
const CURRENT_USER_ID = 'current-user';

const { width } = Dimensions.get('window');
const ITEM_SIZE = width / 3;

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [restricted, setRestricted] = useState(false);

  const nextCursor = useRef<string | null>(null);
  const hasMore = useRef(true);
  const isFetching = useRef(false);

  // ── Load profile + follow status ──────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const [profileData, followData] = await Promise.all([
        fetchUserProfile(userId),
        fetchFollowStatus(userId, CURRENT_USER_ID),
      ]);
      setProfile(profileData);
      setIsFollowing(followData.isFollowing);
    } catch (e) {
      console.error('Failed to load profile:', e);
    } finally {
      setLoadingProfile(false);
    }
  }, [userId]);

  // ── Load posts ────────────────────────────────────────────────────────────

  const loadPosts = useCallback(async (opts: { cursor?: string | null; replace?: boolean } = {}) => {
    if (!userId) return;
    const { cursor = null, replace = false } = opts;
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      const result = await fetchUserPosts(userId, cursor, 12, CURRENT_USER_ID);
      if (result.restricted) {
        setRestricted(true);
        setPosts([]);
      } else {
        setRestricted(false);
        setPosts((prev) => (replace ? result.posts : [...prev, ...result.posts]));
        nextCursor.current = result.nextCursor;
        hasMore.current = result.hasMore;
      }
    } catch (e) {
      console.error('Failed to load posts:', e);
    } finally {
      isFetching.current = false;
      setLoadingPosts(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [userId]);

  // ── Initial load ──────────────────────────────────────────────────────────

  React.useEffect(() => {
    setLoadingProfile(true);
    setLoadingPosts(true);
    nextCursor.current = null;
    hasMore.current = true;
    loadProfile();
    loadPosts({ replace: true });
  }, [loadProfile, loadPosts]);

  // ── Refresh ───────────────────────────────────────────────────────────────

  const onRefresh = () => {
    setRefreshing(true);
    nextCursor.current = null;
    hasMore.current = true;
    loadProfile();
    loadPosts({ replace: true });
  };

  // ── Infinite scroll ───────────────────────────────────────────────────────

  const onEndReached = () => {
    if (!hasMore.current || isFetching.current || restricted) return;
    setLoadingMore(true);
    loadPosts({ cursor: nextCursor.current });
  };

  // ── Follow / Unfollow ─────────────────────────────────────────────────────

  const handleFollowToggle = async () => {
    if (!userId || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        const result = await unfollowUser(userId, CURRENT_USER_ID);
        setIsFollowing(false);
        setProfile((prev) => prev ? { ...prev, followerCount: result.followerCount } : prev);
      } else {
        const result = await followUser(userId, CURRENT_USER_ID);
        setIsFollowing(true);
        setProfile((prev) => prev ? { ...prev, followerCount: result.followerCount } : prev);
        // Reload posts in case profile was private and is now accessible
        if (profile?.isPrivate) {
          setLoadingPosts(true);
          nextCursor.current = null;
          hasMore.current = true;
          loadPosts({ replace: true });
        }
      }
    } catch (e) {
      console.error('Follow toggle failed:', e);
    } finally {
      setFollowLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const formatCount = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  const displayName = profile?.displayName || profile?.username || userId;
  const username = profile?.username || userId;
  const bio = profile?.bio || '';
  const avatarUrl = profile?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${username}&background=random&size=150`;

  // ── Header ────────────────────────────────────────────────────────────────

  const ListHeader = (
    <View>
      <View style={styles.header}>
        {loadingProfile ? (
          <View style={[styles.avatar, styles.avatarPlaceholder]} />
        ) : (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        )}
        <View style={styles.statsRow}>
          <StatItem label="Posts" value={loadingProfile ? '—' : formatCount(profile?.postCount ?? 0)} />
          <StatItem label="Followers" value={loadingProfile ? '—' : formatCount(profile?.followerCount ?? 0)} />
          <StatItem label="Following" value={loadingProfile ? '—' : formatCount(profile?.followingCount ?? 0)} />
        </View>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.displayName}>{loadingProfile ? '...' : displayName}</Text>
        <Text style={styles.usernameText}>@{loadingProfile ? '...' : username}</Text>
        {bio ? <Text style={styles.bio}>{bio}</Text> : null}
      </View>

      {/* Follow / Unfollow button */}
      <TouchableOpacity
        style={[styles.followButton, isFollowing && styles.followingButton]}
        onPress={handleFollowToggle}
        disabled={followLoading}
      >
        {followLoading ? (
          <ActivityIndicator size="small" color={isFollowing ? '#000' : '#fff'} />
        ) : (
          <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Private account notice */}
      {profile?.isPrivate && !isFollowing && (
        <View style={styles.privateBanner}>
          <Ionicons name="lock-closed-outline" size={18} color="#555" />
          <Text style={styles.privateText}>This account is private</Text>
          <Text style={styles.privateSubtext}>Follow to see their posts.</Text>
        </View>
      )}

      {/* Posts grid header line */}
      {!restricted && (
        <View style={styles.tabBar}>
          <View style={[styles.tab, styles.tabActive]}>
            <Ionicons name="grid-outline" size={22} color="#000" />
          </View>
        </View>
      )}
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{ title: username || '', headerBackTitle: 'Back' }} />
      <FlatList
        data={restricted ? [] : posts}
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
          restricted ? null : loadingPosts ? (
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

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  followButton: {
    marginHorizontal: 20,
    marginVertical: 14,
    backgroundColor: '#FF6B35',
    paddingVertical: 9,
    borderRadius: 6,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  followButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  followingButtonText: {
    color: '#000',
  },
  privateBanner: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  privateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  privateSubtext: {
    fontSize: 13,
    color: '#999',
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
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
