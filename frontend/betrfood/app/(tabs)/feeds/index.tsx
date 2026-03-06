import React from 'react';
import { View } from 'react-native';
import Post from '../../../components/Post';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Post
        id="1"
        profilePic="https://randomuser.me/api/portraits/women/44.jpg"
        username="jane_doe"
        postImage="https://picsum.photos/400/300"
        caption="Enjoying the sunny day at the park! 🌞"
      />
      <Post
        id="2"
        profilePic="https://randomuser.me/api/portraits/men/32.jpg"
        username="john_smith"
        postImage="https://picsum.photos/400/301"
        caption="Just finished my morning run. #fitness"
      />
    </View>
  );
}