import React, { useState } from 'react';
import SaveCollectionModal from "./SaveCollectionModal";
import * as Clipboard from 'expo-clipboard';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { Collection } from "../context/CollectionsContext";
import { Tag } from '../services/api';
import TagDisplay from './TagDisplay';
import { deletePost } from '../services/api';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';

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
  tags?: Tag[];
  initialLiked?: boolean;
  initialLikes?: number;
}

export default function Post({
  id,
  profilePic,
  username,
  postImage,
  caption,
  userId,
  currentUserId,
  editedAt,
  onDeleted,
  tags,
  initialLiked = false,
  initialLikes = 0,
}: PostProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [saved, setSaved] = useState(false);
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const { showActionSheetWithOptions } = useActionSheet();

  const isOwner = currentUserId && userId && currentUserId === userId;

  const toggleLike = () => {
    if (liked) {
      setLikeCount((prev) => Math.max(0, prev - 1));
    } else {
      setLikeCount((prev) => prev + 1);
    }
    setLiked((prev) => !prev);
  };

  const handleSavePress = () => {
    if (!saved) setCollectionModalVisible(true);
    else setSaved(false);
  };

  const handleSave = (collection: Collection) => {
    setSaved(true);
    setCollectionModalVisible(false);
    console.log(`Saved to ${collection.name}`);
  };

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

  const handleExternalShare = async () => {
    try {
      await Share.share({
        message: `Check out this post from ${username}: https://yourapp.com/posts/${id}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share the post.');
    }
  };

  const handleCopyLink = async () => {
    const link = `https://yourapp.com/posts/${id}`;
    await Clipboard.setStringAsync(link);
    Alert.alert('Link Copied', 'The post link has been copied to your clipboard.');
  };

  const showShareMenu = () => {
    const options = ['Share Externally', 'Copy Link', 'Cancel'];

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 2,
      },
      (index) => {
        switch (index) {
          case 0:
            handleExternalShare();
            break;
          case 1:
            handleCopyLink();
            break;
        }
      }
    );
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
        <TouchableOpacity onPress={toggleLike} style={styles.actionButton}>
          <Text style={[styles.actionText, liked && styles.liked]}>
            {liked ? '❤️' : '🤍'} {liked ? 'Liked' : 'Like'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSavePress} style={styles.actionButton}>
          <Text style={[styles.actionText, saved && styles.saved]}>
            {saved ? '🔖 Saved' : '🔖 Save'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={showShareMenu} style={styles.actionButton}>
          <Text style={styles.actionText}>🔗 Share</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.likeCount}>
        {likeCount} {likeCount === 1 ? 'like' : 'likes'}
      </Text>

      <Text style={styles.caption}>
        <Text style={styles.captionUsername}>{username} </Text>{caption}
      </Text>
      {editedAt && <Text style={styles.editedLabel}>Edited</Text>}

      {tags && tags.length > 0 && <TagDisplay tags={tags} />}

      <SaveCollectionModal
        visible={collectionModalVisible}
        onClose={() => setCollectionModalVisible(false)}
        onSave={handleSave}
      />
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
  actions: { flexDirection: 'row', paddingHorizontal: 10, paddingTop: 10, gap: 16 },
  actionButton: { paddingVertical: 4 },
  actionText: { fontSize: 16, color: '#333' },
  liked: { color: 'red', fontWeight: '600' },
  saved: { color: 'blue', fontWeight: '600' },
  likeCount: { paddingHorizontal: 10, paddingTop: 4, fontSize: 14, fontWeight: '600', color: '#333' },
  caption: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4, fontSize: 14, color: '#333' },
  captionUsername: { fontWeight: 'bold' },
  editedLabel: { paddingHorizontal: 10, paddingBottom: 10, fontSize: 12, color: '#999', fontStyle: 'italic' },
});
