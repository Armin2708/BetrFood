import { View, Text, Pressable, StyleSheet, Image, FlatList, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback, useContext, useEffect } from 'react';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { AuthContext } from '../../../context/AuthenticationContext';
import VideoThumbnailView from '../../../components/VideoThumbnail';
import CreatorBadge from '../../../components/CreatorBadge';
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
  UserProfile,
  Post as PostType,
} from '../../../services/api';
import { colors } from '../../../constants/theme';

const { width } = Dimensions.get('window');
const ITEM_SIZE = width / 3;

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
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to block user.');
            }
          },
        },
      ]);
    }
  };

  const handleToggleMute = async () => {
    if (!userId) return;
    try {
      if (isMuted) {
        await unmuteUser(userId);
        setIsMuted(false);
        Alert.alert('User Unmuted', 'You will now see this user\'s posts in your feed again.');
      } else {
        await muteUser(userId);
        setIsMuted(true);
        Alert.alert('User Muted', 'You will no longer see this user\'s posts in your feed.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to ${isMuted ? 'unmute' : 'mute'} user.`);
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
    if (!userId) return;
    const reasons = ['Spam', 'Inappropriate', 'Harassment', 'Other'];
    Alert.alert('Report User', 'Select a reason:', [
      ...reasons.map((reason) => ({
        text: reason,
        onPress: () => {
          if (reason === 'Other') {
            Alert.prompt(
              'Report User',
              'Please describe the issue:',
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
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
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

      // Load follow stats, follow status, block/mute status, and posts in parallel
      const [stats, followStatus, blockStatus, muteStatus, postsResult] = await Promise.all([
        fetchFollowStats(userId).catch(() => ({ followerCount: 0, followingCount: 0 })),
        checkFollowStatus(userId).catch(() => ({ isFollowing: false })),
        checkBlockStatus(userId).catch(() => ({ isBlocked: false })),
        checkMuteStatus(userId).catch(() => ({ isMuted: false })),
        fetchUserPosts(userId).catch(() => ({ posts: [] as PostType[] })),
      ]);

      setFollowStats(stats);
      setIsFollowing(followStatus.isFollowing);
      setIsBlocked(blockStatus.isBlocked);
      setIsMuted(muteStatus.isMuted);
      setUserPosts(postsResult.posts);
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

    const wasFollowing = isFollowing;
    // Optimistic update
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
      // Rollback on failure
      setIsFollowing(wasFollowing);
      setFollowStats(prev => ({
        ...prev,
        followerCount: wasFollowing ? prev.followerCount + 1 : prev.followerCount - 1,
      }));
      console.error('Failed to toggle follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ title: '', headerShown: true, headerLeft: () => (
          <Pressable onPress={() => router.back()} style={{ paddingRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </Pressable>
        )}} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: profile?.username ? `@${profile.username}` : 'Profile',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ paddingRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={showUserMenu} style={{ paddingLeft: 16 }}>
              <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
            </Pressable>
          ),
        }}
      />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={{ uri: getAvatarUrl(profile?.avatarUrl, profile?.displayName || profile?.username) }} style={styles.avatar} />

          <View style={styles.statsRow}>
            <Stat label="Following" value={String(followStats.followingCount)} />
            <Stat label="Followers" value={String(followStats.followerCount)} />
            <Stat label="Posts" value={String(userPosts.length)} />
          </View>
        </View>

        {/* Username + Bio */}
        <View style={styles.userInfo}>
          {profile?.displayName ? (
            <View style={styles.displayNameRow}>
              <Text style={styles.displayName}>{profile.displayName}</Text>
              {profile.isCreator && <CreatorBadge />}
            </View>
          ) : null}
          <Text style={styles.username}>
            {profile?.username ? `@${profile.username}` : '@unknown'}
          </Text>
          {profile?.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : null}
        </View>

        {/* Follow/Unfollow Button */}
        <Pressable
          style={[styles.followButton, isFollowing && styles.followingButton, followLoading && styles.followButtonDisabled]}
          onPress={handleFollowToggle}
          disabled={followLoading}
          accessibilityRole="button"
          accessibilityLabel={isFollowing ? 'Unfollow user' : 'Follow user'}
        >
          {followLoading ? (
            <ActivityIndicator size="small" color={isFollowing ? colors.textPrimary : colors.white} />
          ) : (
            <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          )}
        </Pressable>

        {/* Post Grid */}
        <FlatList
          data={userPosts}
          keyExtractor={(item) => item.id}
          numColumns={3}
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
          ListEmptyComponent={
            <View style={styles.emptyGrid}>
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          }
        />
      </View>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
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
  avatarFallback: {
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  statValue: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  userInfo: {
    paddingHorizontal: 20,
  },
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayName: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  username: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  bio: {
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  followButton: {
    margin: 20,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  followingButton: {
    backgroundColor: colors.backgroundPrimary,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textPrimary,
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    backgroundColor: colors.borderLight,
    borderWidth: 0.5,
    borderColor: colors.backgroundPrimary,
  },
  emptyGrid: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textQuaternary,
  },
});
