import { View, Text, Pressable, StyleSheet, Image, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router'
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { fetchMyProfile, UserProfile } from '../../../services/api';

const { width } = Dimensions.get('window');
const ITEM_SIZE = width / 3;

const mockPosts = Array.from({ length: 18 }).map((_, i) => ({
  id: i.toString(),
}));

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const data = await fetchMyProfile();
      setProfile(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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
            <Stat label="Following" value="0" callback={ () => router.push('/profile/info/followingScreen') }/>
            <Stat label="Followers" value="0" callback={ () => router.push('/profile/info/followersScreen') } />
            <Stat label="Likes" value="0" callback={ () => {} }/>
          </View>
        </View>

        {/* Username + Bio */}
        <View style={styles.userInfo}>
          {profile?.displayName ? (
            <Text style={styles.displayName}>{profile.displayName}</Text>
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

        {/* Post Grid */}
        <FlatList
          data={mockPosts}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={() => <View style={styles.gridItem} />}
          showsVerticalScrollIndicator={false}
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
  displayName: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
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
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    backgroundColor: '#eee',
    borderWidth: 0.5,
    borderColor: '#fff',
  },
});
