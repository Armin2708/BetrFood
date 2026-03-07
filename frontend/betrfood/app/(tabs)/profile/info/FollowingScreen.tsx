import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

type User = {
  id: string;
  username: string;
  name: string;
  avatar: string;
  isFollowing: boolean;
};

const initialUsers: User[] = [
  {
    id: '1',
    username: 'johndoe',
    name: 'John Doe',
    avatar: 'https://i.pravatar.cc/150?img=1',
    isFollowing: true,
  },
  {
    id: '2',
    username: 'janedoe',
    name: 'Jane Doe',
    avatar: 'https://i.pravatar.cc/150?img=2',
    isFollowing: false,
  },
];

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
  const [users, setUsers] = useState<User[]>(initialUsers);

  const toggleFollow = (id: string) => {
    setUsers(prev =>
      prev.map(user =>
        user.id === id
          ? { ...user, isFollowing: !user.isFollowing }
          : user
      )
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={item => item.id}
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