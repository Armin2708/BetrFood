import { View, Text, Pressable, StyleSheet, Image, FlatList, Dimensions, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback, useContext, useEffect } from 'react';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { AuthContext } from '../../../context/AuthenticationContext';
import VideoThumbnailView from '../../../components/VideoThumbnail';
import {
  fetchUserProfile,
  fetchFollowStats,
  fetchUserPosts,
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
} from '../../../services/api';
import { colors } from '../../../constants/theme';

const { width } = Dimensions.get('window');
const GRID_GAP = 2;
const ITEM_SIZE = (width - GRID_GAP * 2) / 3;

function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(count % 1_000_000 === 0 ? 0 : 1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(count % 1_000 === 0 ? 0 : 1)}K`;
  return String(count);
}

export default function UserProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user: currentUser } = useContext(AuthContext);

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

      {/* Followers / Following / Posts stats */}
      <View style={styles.followRow}>
        <View style={styles.followItem}>
          <Text style={styles.followCount}>{formatCount(followStats.followerCount)}</Text>
          <Text style={styles.followLabel}>  Followers</Text>
        </View>
        <View style={styles.followSpacer} />
        <View style={styles.followItem}>
          <Text style={styles.followCount}>{formatCount(followStats.followingCount)}</Text>
          <Text style={styles.followLabel}>  Following</Text>
        </View>
      </View>

      {/* Blocked/Muted indicators */}
      {isBlocked && (
        <View style={styles.statusBanner}>
          <Ionicons name="ban-outline" size={16} color="#DC2626" />
          <Text style={styles.statusBannerText}>You have blocked this user</Text>
        </View>
      )}
      {isMuted && !isBlocked && (
        <View style={[styles.statusBanner, styles.statusBannerMuted]}>
          <Ionicons name="volume-mute-outline" size={16} color="#D97706" />
          <Text style={[styles.statusBannerText, styles.statusBannerTextMuted]}>You have muted this user</Text>
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
          <Text style={styles.privateTitle}>This account is private</Text>
          <Text style={styles.privateSubtitle}>Follow this account to see their posts</Text>
        </View>
      )}

      {/* Tab divider */}
      {(!isPrivate || isFollowing) && (
        <View style={styles.tabDivider}>
          <View style={styles.tabIconContainer}>
            <Ionicons name="albums-outline" size={22} color="#000" />
          </View>
        </View>
      )}
    </View>
  );

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
          <FlatList
            data={userPosts}
            keyExtractor={(item) => item.id}
            numColumns={3}
            ListHeaderComponent={renderProfileHeader}
            renderItem={({ item }) => (
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
            )}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyGrid}>
                <Ionicons name="camera-outline" size={48} color="#CBD5E1" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>No posts yet</Text>
              </View>
            }
          />
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
    fontSize: 25,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  verifiedBadge: {
    color: colors.verified,
    fontSize: 16,
    fontWeight: 'bold',
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
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
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
    fontWeight: '600',
    fontSize: 15,
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
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
  },
  privateSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },

  /* Tab divider */
  tabDivider: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabIconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
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
