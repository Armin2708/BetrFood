import React, { useState } from 'react';
import SaveCollectionModal from "./SaveCollectionModal";
import * as Clipboard from 'expo-clipboard';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { Collection } from "../context/CollectionsContext";
import { Tag } from '../services/api';
import TagDisplay from './TagDisplay';
import { useRouter } from 'expo-router';
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
  onDeleted?: (postId: string) => void;
  tags?: Tag[];
}

export default function Post({
  id,
  profilePic,
  username,
  postImage,
  caption,
  userId,
  currentUserId,
  onDeleted,
  tags,
}: PostProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);

  const { showActionSheetWithOptions } = useActionSheet();

  const toggleLike = () => setLiked(!liked);

  const handleSavePress = () => {
    if (!saved) setCollectionModalVisible(true);
    else setSaved(false);
  };

  const handleSave = (collection: Collection) => {
    // TODO: something from the post should be added to the collection
    setSaved(true);
    setCollectionModalVisible(false);
    console.log(`Saved to ${collection.name}`);
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
    showActionSheetWithOptions({ options, cancelButtonIndex: 2 }, (index) => {
      if (index === 0) handleExternalShare();
      if (index === 1) handleCopyLink();
    });
  };

  const handleAuthorPress = () => {
    if (!userId) return;
    // Don't navigate if tapping your own post
    if (userId === currentUserId) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/user/${userId}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header: tappable profile picture + username */}
      <TouchableOpacity style={styles.header} onPress={handleAuthorPress}>
        <Image source={{ uri: profilePic }} style={styles.profilePic} />
        <Text style={styles.username}>{username}</Text>
      </TouchableOpacity>

      {/* Post image */}
      <Image source={{ uri: postImage }} style={styles.postImage} />

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={toggleLike}>
          <Text style={[styles.likeButton, liked && styles.liked]}>
            {liked ? 'Liked' : 'Like'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSavePress}>
          <Text style={[styles.likeButton, saved && styles.saved]}>
            {saved ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={showShareMenu}>
          <Text style={styles.likeButton}>🔗 Share</Text>
        </TouchableOpacity>
      </View>

      {/* Caption */}
      <Text style={styles.caption}>
        <Text style={styles.username}>{username} </Text>
        {caption}
      </Text>

      {/* Tags */}
      {tags && tags.length > 0 && <TagDisplay tags={tags} />}

      {/* Save Modal */}
      <SaveCollectionModal
        visible={collectionModalVisible}
        onClose={() => setCollectionModalVisible(false)}
        onSave={handleSave}
      />
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
    gap: 16,
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
