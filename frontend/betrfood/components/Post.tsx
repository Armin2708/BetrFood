import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { RecipeSummary } from './RecipeDisplay';
import type { Recipe } from '../services/api';

interface PostProps {
  profilePic: string;
  username: string;
  postImage: string;
  caption: string;
  recipe?: Recipe | null;
}

export default function Post({ profilePic, username, postImage, caption, recipe }: PostProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleLike = () => setLiked(!liked);
  const toggleSave = () => setSaved(!saved);

  return (
    <View style={styles.container}>
      {/* Header: profile picture + username */}
      <View style={styles.header}>
        <Image source={{ uri: profilePic }} style={styles.profilePic} />
        <Text style={styles.username}>{username}</Text>
      </View>

      {/* Post image */}
      <Image source={{ uri: postImage }} style={styles.postImage} />

      {/* Actions */}
      <View style={styles.actions}>
        {/* Like button */}
        <TouchableOpacity onPress={toggleLike}>
          <Text style={[styles.likeButton, liked && styles.liked]}>
            {liked ? '❤️ Liked' : '🤍 Like'}
          </Text>
        </TouchableOpacity>
        {/* Save button */}
        <TouchableOpacity onPress={toggleSave}>
          <Text style={[styles.likeButton, saved && styles.saved]}>
            {saved ? '💙 Saved' : '🤍 Save'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Caption */}
      <Text style={styles.caption}>
        <Text style={styles.username}>{username} </Text>
        {caption}
      </Text>

      {/* Recipe summary */}
      {recipe && <RecipeSummary recipe={recipe} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  postImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#eee',
  },
  actions: {
    flexDirection: 'row',
    padding: 10,
  },
  likeButton: {
    fontSize: 16,
    color: '#333',
  },
  liked: {
    color: 'red',
  },
  saved: {
    color: 'blue',
  },
  caption: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: '#333',
  },
});