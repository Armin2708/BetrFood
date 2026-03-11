import { View, Text, Pressable, StyleSheet, Image, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router'
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback, useContext } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../../context/AuthenticationContext';
import { fetchMyProfile, fetchFollowStats, fetchPosts, getImageUrl, UserProfile, Post as PostType } from '../../../services/api';

const { width } = Dimensions.get('window');
const ITEM_SIZE = width / 3;

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followStats, setFollowStats] = useState({ followerCount: 0, followingCount: 0 });
  const [userPosts, setUserPosts] = useState<PostType[]>([]);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchMyProfile();
      setProfile(data);

      // Load follow stats
      if (data.id) {
        fetchFollowStats(data.id)
          .then(stats => setFollowStats(stats))
          .catch(() => {});
      }

      // Load user's posts
      fetchPosts(null, 50)
        .then(result => {
          const myPosts = result.posts.filter(p => p.userId === data.id);
          setUserPosts(myPosts);
        })
        .catch(() => {});
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <>
      {/* Settings cog */}
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/profile/settings')}>
              <Ionicons name='settings-outline' size={24}/>
            </Pressable>
          ),
        }}
      />

      <View style={styles.container}>
        {/* Settings icon */}
        <View style={styles.settingsRow}>
          <Pressable onPress={() => router.push('/profile/settings')} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color="#333" />
          </Pressable>
        </View>

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
            <Stat label="Following" value={String(followStats.followingCount)} callback={ () => router.push('/profile/info/followingScreen') }/>
            <Stat label="Followers" value={String(followStats.followerCount)} callback={ () => router.push('/profile/info/followersScreen') } />
            <Stat label="Posts" value={String(userPosts.length)} callback={ () => {} }/>
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

        {/* Edit Profile Button */}
        <Pressable style={styles.editButton} onPress={() => router.push("/profile/info/editProfile")}>
          <View>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </View>
        </Pressable>

        {/* Collections Button */}
        <Pressable style={styles.collectionsButton} onPress={() => router.push("/profile/collections")}>
          <Ionicons name="folder-outline" size={18} color="#4CAF50" />
          <Text style={styles.collectionsButtonText}>Collections</Text>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
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

function Stat({ label, value, callback }: { label: string; value: string; callback: () => void }) {
  return (
    <View style={styles.statItem}>
      <Pressable onPress={ callback }>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  settingsButton: {
    padding: 8,
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
  editButton: {
    margin: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#000',
    fontWeight: '500',
  },
  collectionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  collectionsButtonText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
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
