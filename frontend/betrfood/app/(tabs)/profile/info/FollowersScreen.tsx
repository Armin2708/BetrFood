import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';

type Follower = {
  id: string;
  username: string;
  name: string;
  avatar: string;
  isFollowingBack: boolean;
};

const initialFollowers: Follower[] = Array.from({length: 1000}, (_, i) => ({
  id: i.toString(),
  username: 'standinUser' + (i+1).toString(),
  name: 'user' + (i+1).toString(),
  avatar: `https://picsum.photos/id/${i+40}/60`,
  isFollowingBack: i%4 === 0,
})

);

type FollowerRowProps = {
  follower: Follower;
  onToggleFollowBack: (id: string) => void;
  onRemoveFollower: (id: string) => void;
};

const FollowerRow: React.FC<FollowerRowProps> = ({
  follower,
  onToggleFollowBack,
  onRemoveFollower,
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

      <TouchableOpacity
        style={[styles.button, styles.remove]}
        onPress={() => onRemoveFollower(follower.id)}
      >
        <Text style={[styles.buttonText, styles.removeText]}>
          Remove
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default function FollowersScreen() {
  const [followers, setFollowers] = useState<Follower[]>(initialFollowers);
  const [refreshing, setRefreshing] = useState(false)

  const toggleFollowBack = (id: string) => {
    setFollowers(prev =>
      prev.map(f =>
        f.id === id
          ? { ...f, isFollowingBack: !f.isFollowingBack }
          : f
      )
    );
  };

  const removeFollower = (id: string) => {
    setFollowers(prev => prev.filter(f => f.id !== id));
  };

  const onRefresh = () => {
    setRefreshing(true);

    // TODO: for testing, replace with api call
    setTimeout(() => {
      console.log('"reload" complete');
      setRefreshing(false);
    }, 1000)
  };

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
            onRemoveFollower={removeFollower}
          />
        )}
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
  remove: {
    backgroundColor: '#f2f2f2',
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
  removeText: {
    color: '#000',
  },
});