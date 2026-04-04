import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { AuthContext } from '../../../../context/AuthenticationContext';
import { fetchFollowing, followUser, unfollowUser, type FollowingUser } from '../../../../services/api/follows';

type UserRowProps = {
  user: FollowingUser;
  onToggleFollow: (id: string) => void;
};

const UserRow: React.FC<UserRowProps> = ({ user, onToggleFollow }) => {
  return (
    <View style={styles.row}>
      <Image source={{ uri: user.avatar }} style={styles.avatar} />

      <View style={styles.info}>
        <Text style={styles.username}>{user.username}</Text>
        <Text style={styles.name}>{user.name}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          user.isFollowing ? styles.following : styles.follow,
        ]}
        onPress={() => onToggleFollow(user.id)}
      >
        <Text
          style={[
            styles.buttonText,
            user.isFollowing ? styles.followingText : styles.followText,
          ]}
        >
          {user.isFollowing ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default function FollowingScreen() {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState<FollowingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFollowing = async () => {
    if (!user?.id) return;

    try {
      const data = await fetchFollowing(user.id);
      setUsers(data);
    } catch (error) {
      console.error('Error loading following:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowing();
  }, [user?.id]);

  const toggleFollow = async (id: string) => {
    const userToUpdate = users.find(u => u.id === id);
    if (!userToUpdate) return;

    // Optimistic update
    setUsers(prev =>
      prev.map(user =>
        user.id === id
          ? { ...user, isFollowing: !user.isFollowing }
          : user
      )
    );

    try {
      if (userToUpdate.isFollowing) {
        await unfollowUser(id);
      } else {
        await followUser(id);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      // Revert on error
      setUsers(prev =>
        prev.map(user =>
          user.id === id
            ? { ...user, isFollowing: !user.isFollowing }
            : user
        )
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFollowing();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0095f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <UserRow user={item} onToggleFollow={toggleFollow} />
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Not following anyone yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: 'gray',
    marginTop: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  name: {
    color: 'gray',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  follow: {
    backgroundColor: '#0095f6',
  },
  following: {
    backgroundColor: '#eee',
  },
  buttonText: {
    fontWeight: '600',
  },
  followText: {
    color: '#fff',
  },
  followingText: {
    color: '#000',
  },
});