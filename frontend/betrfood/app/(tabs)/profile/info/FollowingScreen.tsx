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

type User = {
  id: string;
  username: string;
  name: string;
  avatar: string;
  isFollowing: boolean;
};


// Generates random users
const initialUsers: User[] = Array.from({length:1000}, (_,i) => ({
  id: i.toString(),
  username: 'standinUser' + (i+1).toString(),
  name: 'user' + (i+1).toString(),
  avatar: `https://picsum.photos/id/${i+80}/60`,
  isFollowing: true,
}));



type UserRowProps = {
  user: User;
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
  // TODO: replace with api call for user's following list; remove initialUsers array
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [refreshing, setRefreshing] = useState(false)

  // TODO: requires wiring to backend
  const toggleFollow = (id: string) => {
    setUsers(prev =>
      prev.map(user =>
        user.id === id
          ? { ...user, isFollowing: !user.isFollowing }
          : user
      )
    );
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
        data={users}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <UserRow user={item} onToggleFollow={toggleFollow} />
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