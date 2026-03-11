import { View, Text, Pressable, StyleSheet, Image, FlatList, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback, useContext, useEffect } from 'react';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { AuthContext } from '../context/AuthenticationContext';
import {
  fetchUserProfile,
  fetchFollowStats,
  fetchPosts,
  getImageUrl,
  followUser,
  unfollowUser,
  checkFollowStatus,
  blockUser,
  muteUser,
  reportContent,
  UserProfile,
  Post as PostType,
} from '../services/api';

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
  const { showActionSheetWithOptions } = useActionSheet();

  const handleBlockUser = () => {
    if (!userId) return;
    Alert.alert('Block User', 'Are you sure you want to block this user? You will no longer see their content.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            await blockUser(userId);
            Alert.alert('User Blocked', 'This user has been blocked.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to block user.');
          }
        },
      },
    ]);
  };

  const handleMuteUser = async () => {
    if (!userId) return;
    try {
      await muteUser(userId);
      Alert.alert('User Muted', 'This user has been muted. You will no longer see their posts in your feed.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to mute user.');
    }
  };

  const handleReportUser = () => {
    if (!userId) return;
    const reasons = ['Spam', 'Inappropriate', 'Harassment', 'Other'];
    Alert.alert('Report User', 'Select a reason:', [
      ...reasons.map((reason) => ({
        text: reason,
        onPress: async () => {
          try {
            await reportContent('user', userId, reason);
            Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit report.');
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const showUserMenu = () => {
    const options = ['Block User', 'Mute User', 'Report User', 'Cancel'];
    showActionSheetWithOptions(
      { options, cancelButtonIndex: 3, destructiveButtonIndex: 0 },
      (index) => {
        if (index === 0) handleBlockUser();
        if (index === 1) handleMuteUser();
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

      // Load follow stats, follow status, and posts in parallel
      const [stats, status, postsResult] = await Promise.all([
        fetchFollowStats(userId).catch(() => ({ followerCount: 0, followingCount: 0 })),
        checkFollowStatus(userId).catch(() => ({ isFollowing: false })),
        fetchPosts(null, 50).catch(() => ({ posts: [] as PostType[], nextCursor: null, hasMore: false })),
      ]);

      setFollowStats(stats);
      setIsFollowing(status.isFollowing);
      setUserPosts(postsResult.posts.filter((p: PostType) => p.userId === userId));
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
        <Stack.Screen options={{ title: '', headerLeft: () => (
          <Pressable onPress={() => router.back()} style={{ paddingRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </Pressable>
        )}} />
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
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
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={40} color="#999" />
            </View>
          )}

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
              {profile.verified && <Text style={styles.verifiedBadge}>{'\u2713'}</Text>}
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
          style={[styles.followButton, isFollowing && styles.followingButton]}
          onPress={handleFollowToggle}
          disabled={followLoading}
        >
          <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </Pressable>

        {/* Post Grid */}
        <FlatList
          data={userPosts}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={({ item }) => (
            <Image
              source={{ uri: getImageUrl(item.imagePath) }}
              style={styles.gridItem}
            />
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
    backgroundColor: '#fff',
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
    backgroundColor: '#f0f0f0',
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
  },
  statValue: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statLabel: {
    color: '#555',
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
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  verifiedBadge: {
    color: '#1DA1F2',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  username: {
    color: '#555',
    fontSize: 14,
    marginTop: 2,
  },
  bio: {
    color: '#555',
    marginTop: 4,
  },
  followButton: {
    margin: 20,
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
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
  },
  followingButtonText: {
    color: '#000',
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    backgroundColor: '#eee',
    borderWidth: 0.5,
    borderColor: '#fff',
  },
  emptyGrid: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
