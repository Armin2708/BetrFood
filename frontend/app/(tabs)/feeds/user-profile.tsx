import { View, Text, Pressable, StyleSheet, Image, FlatList, Dimensions, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback, useContext, useEffect, useMemo } from 'react';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { AuthContext } from '../../../context/AuthenticationContext';
import { useFeedLayout } from '../../../context/FeedLayoutContext';
import { useScaledTypography } from '../../../hooks/useScaledTypography';
import VideoThumbnailView from '../../../components/VideoThumbnail';
import {
  fetchUserProfile,
  fetchFollowStats,
  fetchUserPosts,
  fetchUserPantry,
  getImageUrl,
  getAvatarUrl,
  followUser,
  unfollowUser,
  checkFollowStatus,
  checkBlockStatus,
  checkMuteStatus,
  blockUser,
  unblockUser,
  muteUser,
  unmuteUser,
  reportContent,
  checkFollowRequestStatus,
  cancelFollowRequest,
  UserProfile,
  Post as PostType,
  PantryItem,
} from '../../../services/api';
import { colors } from '../../../constants/theme';

const { width } = Dimensions.get('window');
const GRID_GAP = 2;
const ITEM_SIZE = (width - GRID_GAP * 2) / 3;
const LIST_ITEM_HEIGHT = Math.round(width * 0.9);

function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(count % 1_000_000 === 0 ? 0 : 1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(count % 1_000 === 0 ? 0 : 1)}K`;
  return String(count);
}

type PantryListRow =
  | { type: 'category'; category: string }
  | { type: 'item'; item: PantryItem };

export default function UserProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user: currentUser } = useContext(AuthContext);
  const { layout: feedLayout } = useFeedLayout();
  const scaledTypography = useScaledTypography();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followStats, setFollowStats] = useState({ followerCount: 0, followingCount: 0 });
  const [userPosts, setUserPosts] = useState<PostType[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [followRequestStatus, setFollowRequestStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const { showActionSheetWithOptions } = useActionSheet();

  const [activeTab, setActiveTab] = useState<'posts' | 'pantry'>('posts');
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [pantryLoading, setPantryLoading] = useState(false);
  const [pantryError, setPantryError] = useState<string | null>(null);
  const [pantryLoaded, setPantryLoaded] = useState(false);

  const handleToggleBlock = () => {
    if (!userId) return;
    if (isBlocked) {
      Alert.alert('Unblock User', 'Are you sure you want to unblock this user?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              await unblockUser(userId);
              setIsBlocked(false);
              Alert.alert('User Unblocked', 'You can now see each other\'s content again.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to unblock user.');
            }
          },
        },
      ]);
    } else {
      Alert.alert('Block User', 'Are you sure you want to block this user? You will no longer see their content and they won\'t see yours.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(userId);
              setIsBlocked(true);
              Alert.alert('User Blocked', 'This user has been blocked.', [
                { text: 'OK', onPress: () => router.canGoBack() ? router.back() : router.replace('/(tabs)/feeds') },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to block user.');
            }
          },
        },
      ]);
    }
  };

  const handleToggleMute = () => {
    if (!userId) return;
    if (isMuted) {
      Alert.alert('Unmute User', 'You will see this user\'s posts again.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unmute',
          onPress: async () => {
            try {
              await unmuteUser(userId);
              setIsMuted(false);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to unmute user.');
            }
          },
        },
      ]);
    } else {
      Alert.alert('Mute User', 'You will no longer see this user\'s posts in your feed.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mute',
          onPress: async () => {
            try {
              await muteUser(userId);
              setIsMuted(true);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to mute user.');
            }
          },
        },
      ]);
    }
  };

  const submitUserReport = async (reason: string) => {
    if (!userId) return;
    try {
      await reportContent('user', userId, reason);
      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit report.');
    }
  };

  const handleReportUser = () => {
    const reasons = ['Spam', 'Harassment', 'Inappropriate Content', 'Fake Account', 'Other'];
    showActionSheetWithOptions(
      { options: [...reasons, 'Cancel'], cancelButtonIndex: reasons.length, title: 'Report User' },
      (index) => {
        if (index === undefined || index === reasons.length) return;
        const reason = reasons[index];
        if (reason === 'Other') {
          Alert.prompt(
            'Report User',
            'Please provide details:',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Submit',
                onPress: (text?: string) => {
                  const detail = text?.trim();
                  submitUserReport(detail ? `Other: ${detail}` : 'Other');
                },
              },
            ],
            'plain-text',
            '',
            'default'
          );
        } else {
          submitUserReport(reason);
        }
      },
    );
  };

  const showUserMenu = () => {
    const blockLabel = isBlocked ? 'Unblock User' : 'Block User';
    const muteLabel = isMuted ? 'Unmute User' : 'Mute User';
    const options = [blockLabel, muteLabel, 'Report User', 'Cancel'];
    showActionSheetWithOptions(
      { options, cancelButtonIndex: 3, destructiveButtonIndex: isBlocked ? undefined : 0 },
      (index) => {
        if (index === 0) handleToggleBlock();
        if (index === 1) handleToggleMute();
        if (index === 2) handleReportUser();
      }
    );
  };

  // If viewing own profile, redirect to profile tab
  useEffect(() => {
    if (currentUser && userId && currentUser.id === userId) {
      router.replace('/(tabs)/profile');
    }
  }, [currentUser, userId]);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);

      const data = await fetchUserProfile(userId);
      setProfile(data);

      const profileIsPrivate = !!(data as any).isPrivate;
      setIsPrivate(profileIsPrivate);

      const [stats, followStatus, blockStatus, muteStatus, reqStatus, postsResult] = await Promise.all([
        fetchFollowStats(userId).catch(() => ({ followerCount: 0, followingCount: 0 })),
        checkFollowStatus(userId).catch(() => ({ isFollowing: false })),
        checkBlockStatus(userId).catch(() => ({ isBlocked: false })),
        checkMuteStatus(userId).catch(() => ({ isMuted: false })),
        checkFollowRequestStatus(userId).catch(() => ({ status: 'none' as const })),
        profileIsPrivate ? Promise.resolve({ posts: [] as PostType[] }) : fetchUserPosts(userId).catch(() => ({ posts: [] as PostType[] })),
      ]);

      setFollowStats(stats);
      setIsFollowing(followStatus.isFollowing);
      setIsBlocked(blockStatus.isBlocked);
      setIsMuted(muteStatus.isMuted);
      setFollowRequestStatus(reqStatus.status);

      if (profileIsPrivate && followStatus.isFollowing) {
        const postsData = await fetchUserPosts(userId).catch(() => ({ posts: [] as PostType[] }));
        setUserPosts(postsData.posts);
      } else {
        setUserPosts(postsResult.posts);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const loadPantry = useCallback(async () => {
    if (!userId || pantryLoaded || pantryLoading) return;
    setPantryLoading(true);
    setPantryError(null);
    try {
      const items = await fetchUserPantry(userId);
      setPantryItems(items);
      setPantryLoaded(true);
    } catch (err: any) {
      setPantryError(err.message || 'Unable to load pantry.');
    } finally {
      setPantryLoading(false);
    }
  }, [userId, pantryLoaded, pantryLoading]);

  const handleTabSwitch = (tab: 'posts' | 'pantry') => {
    setActiveTab(tab);
    if (tab === 'pantry' && !pantryLoaded && !pantryLoading) {
      loadPantry();
    }
  };

  const pantryListData = useMemo<PantryListRow[]>(() => {
    const groups: Record<string, PantryItem[]> = {};
    pantryItems.forEach(item => {
      const cat = item.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    const rows: PantryListRow[] = [];
    Object.keys(groups).sort().forEach(cat => {
      rows.push({ type: 'category', category: cat });
      groups[cat].forEach(item => rows.push({ type: 'item', item }));
    });
    return rows;
  }, [pantryItems]);

  const handleFollowToggle = async () => {
    if (!userId || followLoading) return;

    if (followRequestStatus === 'pending') {
      setFollowLoading(true);
      try {
        await cancelFollowRequest(userId);
        setFollowRequestStatus('none');
      } catch (error) {
        console.error('Failed to cancel follow request:', error);
      } finally {
        setFollowLoading(false);
      }
      return;
    }

    if (!isPrivate || isFollowing) {
      const wasFollowing = isFollowing;
      setIsFollowing(!wasFollowing);
      setFollowStats(prev => ({
        ...prev,
        followerCount: wasFollowing ? prev.followerCount - 1 : prev.followerCount + 1,
      }));
      setFollowLoading(true);
      try {
        if (wasFollowing) {
          await unfollowUser(userId);
        } else {
          await followUser(userId);
        }
      } catch (error) {
        setIsFollowing(wasFollowing);
        setFollowStats(prev => ({
          ...prev,
          followerCount: wasFollowing ? prev.followerCount + 1 : prev.followerCount - 1,
        }));
        console.error('Failed to toggle follow:', error);
      } finally {
        setFollowLoading(false);
      }
    } else {
      setFollowLoading(true);
      try {
        await followUser(userId);
        setFollowRequestStatus('pending');
      } catch (error) {
        console.error('Failed to send follow request:', error);
      } finally {
        setFollowLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ title: '', headerShown: true, headerLeft: () => (
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/feeds')} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </Pressable>
        )}} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderProfileHeader = () => (
    <View style={styles.profileHeaderWrapper}>
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
          <Text style={[styles.displayName, scaledTypography.title]}>{profile.displayName}</Text>
          {profile.verified && (
            <Text style={[styles.verifiedBadge, scaledTypography.label]}>{'✓'}</Text>
          )}
        </View>
      ) : null}

      {/* Username */}
      <Text style={[styles.username, scaledTypography.caption]}>
        {profile?.username ? `@${profile.username}` : '@unknown'}
      </Text>

      {/* Bio */}
      {profile?.bio ? (
        <Text style={[styles.bio, scaledTypography.body]}>{profile.bio}</Text>
      ) : null}

      {/* Followers / Following / Posts stats */}
      <View style={styles.followRow}>
        <View style={styles.followItem}>
          <Text style={[styles.followCount, scaledTypography.label]}>{formatCount(followStats.followerCount)}</Text>
          <Text style={[styles.followLabel, scaledTypography.caption]}>  Followers</Text>
        </View>
        <View style={styles.followSpacer} />
        <View style={styles.followItem}>
          <Text style={[styles.followCount, scaledTypography.label]}>{formatCount(followStats.followingCount)}</Text>
          <Text style={[styles.followLabel, scaledTypography.caption]}>  Following</Text>
        </View>
      </View>

      {/* Blocked/Muted indicators */}
      {isBlocked && (
        <View style={styles.statusBanner}>
          <Ionicons name="ban-outline" size={16} color="#DC2626" />
          <Text style={[styles.statusBannerText, scaledTypography.caption]}>You have blocked this user</Text>
        </View>
      )}
      {isMuted && !isBlocked && (
        <View style={[styles.statusBanner, styles.statusBannerMuted]}>
          <Ionicons name="volume-mute-outline" size={16} color="#D97706" />
          <Text style={[styles.statusBannerText, styles.statusBannerTextMuted, scaledTypography.caption]}>You have muted this user</Text>
        </View>
      )}

      {/* Follow/Unfollow/Request Button */}
      <Pressable
        style={[
          styles.followButton,
          (isFollowing || followRequestStatus === 'pending') && styles.followingButton,
          followLoading && styles.followButtonDisabled,
        ]}
        onPress={handleFollowToggle}
        disabled={followLoading}
        accessibilityRole="button"
        accessibilityLabel={
          isFollowing ? 'Unfollow user' :
          followRequestStatus === 'pending' ? 'Cancel follow request' :
          isPrivate ? 'Request to follow' : 'Follow user'
        }
      >
        {followLoading ? (
          <ActivityIndicator size="small" color={(isFollowing || followRequestStatus === 'pending') ? colors.textPrimary : colors.white} />
        ) : (
          <Text style={[
            styles.followButtonText,
            scaledTypography.label,
            (isFollowing || followRequestStatus === 'pending') && styles.followingButtonText,
          ]}>
            {isFollowing ? 'Following' :
             followRequestStatus === 'pending' ? 'Requested' :
             isPrivate ? 'Request Follow' : 'Follow'}
          </Text>
        )}
      </Pressable>

      {/* Private Profile Notice */}
      {isPrivate && !isFollowing && (
        <View style={styles.privateNotice}>
          <Ionicons name="lock-closed" size={40} color={colors.textQuaternary} />
          <Text style={[styles.privateTitle, scaledTypography.title]}>This account is private</Text>
          <Text style={[styles.privateSubtitle, scaledTypography.body]}>Follow this account to see their posts</Text>
        </View>
      )}

      {/* Tab bar */}
      {(!isPrivate || isFollowing) && (
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tabItem, activeTab === 'posts' && styles.tabItemActive]}
            onPress={() => handleTabSwitch('posts')}
            accessibilityRole="tab"
            accessibilityLabel="Posts tab"
          >
            <Ionicons
              name="albums-outline"
              size={22}
              color={activeTab === 'posts' ? colors.primary : '#94A3B8'}
            />
          </Pressable>
          <Pressable
            style={[styles.tabItem, activeTab === 'pantry' && styles.tabItemActive]}
            onPress={() => handleTabSwitch('pantry')}
            accessibilityRole="tab"
            accessibilityLabel="Pantry tab"
          >
            <Ionicons
              name="basket-outline"
              size={22}
              color={activeTab === 'pantry' ? colors.primary : '#94A3B8'}
            />
          </Pressable>
        </View>
      )}
    </View>
  );

  const renderPantryRow = ({ item }: { item: PantryListRow }) => {
    if (item.type === 'category') {
      return (
        <View style={styles.pantryCategoryHeader}>
          <Text style={[styles.pantryCategoryText, scaledTypography.caption]}>{item.category}</Text>
        </View>
      );
    }
    return (
      <View style={styles.pantryItemRow}>
        <Text style={[styles.pantryItemName, scaledTypography.body]} numberOfLines={1}>
          {item.item.name}
        </Text>
        <Text style={[styles.pantryItemQty, scaledTypography.caption]}>
          {item.item.quantity}{item.item.unit ? ` ${item.item.unit}` : ''}
        </Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: profile?.username ? `@${profile.username}` : 'Profile',
          headerLeft: () => (
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/feeds')} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={showUserMenu} style={styles.headerButton}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
            </Pressable>
          ),
        }}
      />

      <View style={styles.container}>
        {(!isPrivate || isFollowing) ? (
          activeTab === 'posts' ? (
            <FlatList
              key={feedLayout + '-posts'}
              data={userPosts}
              keyExtractor={(item) => item.id}
              numColumns={feedLayout === 'grid' ? 3 : 1}
              ListHeaderComponent={renderProfileHeader}
              renderItem={({ item }) =>
                feedLayout === 'grid' ? (
                  <View>
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
                  </View>
                ) : (
                  <View style={styles.listItem}>
                    {item.mediaType === 'video' ? (
                      <VideoThumbnailView
                        videoUri={getImageUrl(item.imagePath)}
                        style={styles.listMedia}
                      />
                    ) : (
                      <Image
                        source={{ uri: getImageUrl(item.imagePath) }}
                        style={styles.listMedia}
                        accessibilityLabel={item.caption || 'Post image'}
                      />
                    )}
                    {item.caption ? (
                      <Text style={[styles.listCaption, scaledTypography.body]} numberOfLines={2}>
                        {item.caption}
                      </Text>
                    ) : null}
                  </View>
                )
              }
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyGrid}>
                  <Ionicons name="camera-outline" size={48} color="#CBD5E1" style={{ marginBottom: 12 }} />
                  <Text style={[styles.emptyText, scaledTypography.body]}>No posts yet</Text>
                </View>
              }
            />
          ) : (
            <FlatList<PantryListRow>
              key="pantry"
              data={pantryListData}
              keyExtractor={(item, index) =>
                item.type === 'item' ? item.item.id : `cat-${item.category}-${index}`
              }
              ListHeaderComponent={renderProfileHeader}
              renderItem={renderPantryRow}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                pantryLoading ? (
                  <View style={styles.emptyGrid}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                ) : pantryError ? (
                  <View style={styles.emptyGrid}>
                    <Ionicons name="lock-closed-outline" size={48} color="#CBD5E1" style={{ marginBottom: 12 }} />
                    <Text style={[styles.emptyText, scaledTypography.body]}>{pantryError}</Text>
                  </View>
                ) : (
                  <View style={styles.emptyGrid}>
                    <Ionicons name="basket-outline" size={48} color="#CBD5E1" style={{ marginBottom: 12 }} />
                    <Text style={[styles.emptyText, scaledTypography.body]}>No pantry items</Text>
                  </View>
                )
              }
            />
          )
        ) : (
          renderProfileHeader()
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  profileHeaderWrapper: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  /* Avatar */
  avatarContainer: {
    marginTop: 20,
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
    color: colors.textPrimary,
    textAlign: 'center',
  },
  verifiedBadge: {
    color: colors.verified,
    marginLeft: 6,
  },

  /* Username */
  username: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },

  /* Bio */
  bio: {
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
    color: '#000000',
  },
  followLabel: {
    color: '#64748B',
  },
  followSpacer: {
    width: 24,
  },

  /* Status banners */
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  statusBannerMuted: {
    backgroundColor: '#FEF3C7',
  },
  statusBannerText: {
    color: '#DC2626',
  },
  statusBannerTextMuted: {
    color: '#D97706',
  },

  /* Follow button */
  followButton: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginHorizontal: 20,
    alignSelf: 'stretch',
  },
  followingButton: {
    backgroundColor: colors.backgroundPrimary,
    borderColor: '#E2E8F0',
  },
  followButtonDisabled: {
    opacity: 0.6,
  },
  followButtonText: {
    color: colors.white,
  },
  followingButtonText: {
    color: '#64748B',
  },

  /* Private profile notice */
  privateNotice: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
  },
  privateTitle: {
    color: colors.textPrimary,
    marginTop: 16,
  },
  privateSubtitle: {
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },

  /* Tab bar */
  tabBar: {
    width: '100%',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },

  /* Post grid */
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    backgroundColor: colors.borderLight,
    borderRadius: 8,
    overflow: 'hidden',
  },

  /* Post list */
  listItem: {
    width: '100%',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: colors.backgroundPrimary,
  },
  listMedia: {
    width: '100%',
    height: LIST_ITEM_HEIGHT,
    backgroundColor: colors.borderLight,
    borderRadius: 12,
    overflow: 'hidden',
  },
  listCaption: {
    marginTop: 10,
    lineHeight: 20,
    color: colors.textPrimary,
  },

  /* Pantry */
  pantryCategoryHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
    backgroundColor: colors.backgroundPrimary,
  },
  pantryCategoryText: {
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pantryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  pantryItemName: {
    flex: 1,
    color: colors.textPrimary,
  },
  pantryItemQty: {
    color: colors.textSecondary,
    marginLeft: 12,
  },

  /* Empty state */
  emptyGrid: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: colors.textQuaternary,
  },
});
