import { View, Text, Pressable, StyleSheet, Image, FlatList, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router'
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback, useContext, useRef, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../../context/AuthenticationContext';
import { fetchMyProfile, fetchFollowStats, fetchUserPosts, getImageUrl, getAvatarUrl, UserProfile, Post as PostType } from '../../../services/api';
import VideoThumbnailView from '../../../components/VideoThumbnail';
import { colors } from '../../../constants/theme';

const { width } = Dimensions.get('window');
const GRID_GAP = 2;
const ITEM_SIZE = (width - GRID_GAP * 2) / 3;

type ProfileTab = 'posts' | 'collections' | 'liked' | 'recipes';

const TAB_ICONS: { key: ProfileTab; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'posts', icon: 'albums-outline' },
  { key: 'collections', icon: 'bookmark-outline' },
  { key: 'liked', icon: 'thumbs-up-outline' },
  { key: 'recipes', icon: 'receipt-outline' },
];

function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(count % 1_000_000 === 0 ? 0 : 1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(count % 1_000 === 0 ? 0 : 1)}K`;
  return String(count);
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followStats, setFollowStats] = useState({ followerCount: 0, followingCount: 0 });
  const [userPosts, setUserPosts] = useState<PostType[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const loadProfile = useCallback(async () => {
    if (!userRef.current) return;
    try {
      const data = await fetchMyProfile();
      setProfile(data);

      // Load follow stats
      if (data.id) {
        fetchFollowStats(data.id)
          .then(stats => setFollowStats(stats))
          .catch(() => {});
      }

      // Load user's posts using dedicated endpoint
      fetchUserPosts(data.id)
        .then(result => setUserPosts(result.posts))
        .catch(() => {});
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderProfileHeader = () => (
    <View style={styles.profileHeaderWrapper}>
      {/* Top navigation bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => {}}
          style={styles.topBarButton}
          accessibilityRole="button"
          accessibilityLabel="Menu"
        >
          <Ionicons name="menu-outline" size={26} color="#000" />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => router.push('/profile/settings')}
          style={styles.topBarButton}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={24} color="#000" />
        </Pressable>
      </View>

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: getAvatarUrl(profile?.avatarUrl, profile?.displayName || profile?.username) }}
          style={styles.avatar}
          accessibilityLabel={`${profile?.displayName || 'User'}'s profile photo`}
        />
      </View>

      {/* Display name */}
      {profile?.displayName ? (
        <View style={styles.displayNameRow}>
          <Text style={styles.displayName}>{profile.displayName}</Text>
          {profile.verified && (
            <Text style={styles.verifiedBadge}>{'\u2713'}</Text>
          )}
        </View>
      ) : null}

      {/* Username */}
      <Text style={styles.username}>
        {profile?.username ? `@${profile.username}` : '@unknown'}
      </Text>

      {/* Bio */}
      {profile?.bio ? (
        <Text style={styles.bio}>{profile.bio}</Text>
      ) : null}

      {/* Followers / Following stats */}
      <View style={styles.followRow}>
        <Pressable
          onPress={() => router.push('/profile/info/followersScreen')}
          style={styles.followItem}
          accessibilityLabel={`${followStats.followerCount} Followers`}
        >
          <Text style={styles.followCount}>{formatCount(followStats.followerCount)}</Text>
          <Text style={styles.followLabel}>  Followers</Text>
        </Pressable>
        <View style={styles.followSpacer} />
        <Pressable
          onPress={() => router.push('/profile/info/followingScreen')}
          style={styles.followItem}
          accessibilityLabel={`${followStats.followingCount} Following`}
        >
          <Text style={styles.followCount}>{formatCount(followStats.followingCount)}</Text>
          <Text style={styles.followLabel}>  Following</Text>
        </Pressable>
      </View>

      {/* Edit Profile button */}
      <Pressable
        style={styles.editButton}
        onPress={() => router.push("/profile/info/editProfile")}
        accessibilityRole="button"
        accessibilityLabel="Edit profile"
      >
        <Text style={styles.editButtonText}>Edit profile</Text>
      </Pressable>

      {/* Tab icons */}
      <View style={styles.tabRow}>
        {TAB_ICONS.map((tab) => (
          <Pressable
            key={tab.key}
            style={styles.tabItem}
            onPress={() => {
              if (tab.key === 'collections') {
                router.push('/profile/collections');
              } else {
                setActiveTab(tab.key);
              }
            }}
            accessibilityRole="tab"
            accessibilityLabel={tab.key}
            accessibilityState={{ selected: activeTab === tab.key }}
          >
            <View style={[
              styles.tabIconContainer,
              activeTab === tab.key && styles.tabIconContainerActive,
            ]}>
              <Ionicons
                name={tab.icon}
                size={22}
                color={activeTab === tab.key ? '#000' : '#94A3B8'}
              />
            </View>
            {activeTab === tab.key && <View style={styles.tabIndicator} />}
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <FlatList
          data={activeTab === 'posts' ? userPosts : []}
          keyExtractor={(item) => item.id}
          numColumns={3}
          ListHeaderComponent={renderProfileHeader}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/post-detail?postId=${item.id}`)}>
              {item.mediaType === 'video' ? (
                <VideoThumbnailView
                  videoUri={getImageUrl(item.imagePath)}
                  style={styles.gridItem}
                />
              ) : (
                <Image
                  source={{ uri: getImageUrl(item.imagePath) }}
                  style={styles.gridItem}
                  accessibilityLabel={item.caption || 'Post image'}
                />
              )}
            </Pressable>
          )}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#22C55E" />}
          ListEmptyComponent={
            <View style={styles.emptyGrid}>
              <Ionicons name="camera-outline" size={48} color="#CBD5E1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>
                {activeTab === 'posts' ? 'No posts yet' : `No ${activeTab} content yet`}
              </Text>
            </View>
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  profileHeaderWrapper: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  /* Top navigation bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 8,
  },
  topBarButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Avatar */
  avatarContainer: {
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },

  /* Display name */
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  displayName: {
    fontSize: 25,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  verifiedBadge: {
    color: colors.verified,
    fontSize: 16,
    fontWeight: 'bold' as const,
    marginLeft: 6,
  },

  /* Username */
  username: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },

  /* Bio */
  bio: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 12,
    lineHeight: 20,
  },

  /* Followers / Following row */
  followRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  followItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  followLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  followSpacer: {
    width: 24,
  },

  /* Edit Profile button */
  editButton: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    minWidth: 200,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },

  /* Tab icons */
  tabRow: {
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabIconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  tabIconContainerActive: {
    backgroundColor: '#F0FDF4',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 40,
    height: 2,
    backgroundColor: '#000000',
    borderRadius: 1,
  },

  /* Post grid */
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    backgroundColor: colors.borderLight,
    borderRadius: 8,
    overflow: 'hidden',
  },

  /* Empty state */
  emptyGrid: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textQuaternary,
  },
});
