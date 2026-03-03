import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { deletePost } from '../services/api';

interface PostProps {
  id?: string;
  profilePic: string;
  username: string;
  postImage: string;
  caption: string;
  userId?: string;
  currentUserId?: string;
  editedAt?: string | null;
  onDeleted?: (postId: string) => void;
}

export default function Post({
  id, profilePic, username, postImage, caption,
  userId, currentUserId, editedAt, onDeleted,
}: PostProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const isOwner = currentUserId && userId && currentUserId === userId;

  const handleDelete = () => {
    if (!id || !currentUserId) return;
    Alert.alert('Delete Post', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(id, currentUserId);
            if (onDeleted) onDeleted(id);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete post.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: profilePic }} style={styles.profilePic} />
        <Text style={styles.username}>{username}</Text>
        {isOwner && (
          <TouchableOpacity style={styles.menuButton} onPress={() => setMenuVisible(!menuVisible)}>
            <Text style={styles.menuDots}>...</Text>
          </TouchableOpacity>
        )}
      </View>
      {menuVisible && isOwner && (
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); handleDelete(); }}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
      <Image source={{ uri: postImage }} style={styles.postImage} />
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => setLiked(!liked)}>
          <Text style={[styles.actionButton, liked && styles.liked]}>{liked ? 'Liked' : 'Like'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSaved(!saved)}>
          <Text style={[styles.actionButton, saved && styles.saved]}>{saved ? 'Saved' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.caption}>
        <Text style={styles.captionUsername}>{username} </Text>{caption}
      </Text>
      {editedAt && <Text style={styles.editedLabel}>Edited</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#ddd' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  profilePic: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  username: { fontWeight: 'bold', fontSize: 16, flex: 1 },
  menuButton: { padding: 8 },
  menuDots: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  menu: {
    position: 'absolute', top: 50, right: 10, backgroundColor: '#fff', borderRadius: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2,
    shadowRadius: 4, elevation: 5, zIndex: 10, minWidth: 120,
  },
  menuItem: { padding: 12 },
  deleteText: { color: '#e74c3c', fontSize: 16, fontWeight: '600' },
  postImage: { width: '100%', height: 300, backgroundColor: '#eee' },
  actions: { flexDirection: 'row', padding: 10, gap: 16 },
  actionButton: { fontSize: 16, color: '#333' },
  liked: { color: 'red' },
  saved: { color: 'blue' },
  caption: { paddingHorizontal: 10, paddingBottom: 4, fontSize: 14, color: '#333' },
  captionUsername: { fontWeight: 'bold' },
  editedLabel: { paddingHorizontal: 10, paddingBottom: 10, fontSize: 12, color: '#999', fontStyle: 'italic' },
});
