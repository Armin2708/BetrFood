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
import { fetchFollowers, followUser, unfollowUser, type FollowerUser } from '../../../../services/api/follows';

type FollowerRowProps = {
  follower: FollowerUser;
  onToggleFollowBack: (id: string) => void;
};

const FollowerRow: React.FC<FollowerRowProps> = ({
  follower,
  onToggleFollowBack,
}) => {
  return (
    <View style={styles.row}>
      <Image source={{ uri: follower.avatar }} style={styles.avatar} />

      <View style={styles.info}>
        <Text style={styles.username}>{follower.username}</Text>
        <Text style={styles.name}>{follower.name}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          follower.isFollowingBack ? styles.following : styles.follow,
        ]}
        onPress={() => onToggleFollowBack(follower.id)}
      >
        <Text
          style={[
            styles.buttonText,
            follower.isFollowingBack ? styles.followingText : styles.followText,
          ]}
        >
          {follower.isFollowingBack ? 'Following' : 'Follow Back'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default function FollowersScreen() {
  const { user } = useContext(AuthContext);
  const [followers, setFollowers] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFollowers = async () => {
    if (!user?.id) return;

    try {
      const data = await fetchFollowers(user.id);
      setFollowers(data);
    } catch (error) {
      console.error('Error loading followers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowers();
  }, [user?.id]);

  const toggleFollowBack = async (id: string) => {
    const followerToUpdate = followers.find(f => f.id === id);
    if (!followerToUpdate) return;

    // Optimistic update
    setFollowers(prev =>
      prev.map(f =>
        f.id === id
          ? { ...f, isFollowingBack: !f.isFollowingBack }
          : f
      )
    );

    try {
      if (followerToUpdate.isFollowingBack) {
        await unfollowUser(id);
      } else {
        await followUser(id);
      }
    } catch (error) {
      console.error('Error toggling follow back:', error);
      // Revert on error
      setFollowers(prev =>
        prev.map(f =>
          f.id === id
            ? { ...f, isFollowingBack: !f.isFollowingBack }
            : f
        )
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFollowers();
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
        data={followers}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>
        }
        renderItem={({ item }) => (
          <FollowerRow
            follower={item}
            onToggleFollowBack={toggleFollowBack}
          />
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No followers yet</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  follow: {
    backgroundColor: '#0095f6',
  },
  following: {
    backgroundColor: '#eee',
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  followText: {
    color: '#fff',
  },
  followingText: {
    color: '#000',
  },
});