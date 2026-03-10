import React, { useState } from 'react';
import SaveCollectionModal from "./SaveCollectionModal";
import ReportModal from "./ReportModal";
import * as Clipboard from 'expo-clipboard';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { Collection } from "../context/CollectionsContext";
import { Tag } from '../services/api';
import TagDisplay from './TagDisplay';
import ImageCarousel from './ImageCarousel';
import VideoPlayer from './VideoPlayer';
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
  postImages?: string[];
  videoUrl?: string | null;
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
  postImages,
  videoUrl,
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
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const { showActionSheetWithOptions } = useActionSheet();

  const handleSave = (collection: Collection) => {
    setSaved(true);
    setCollectionModalVisible(false);
  };

  const handleExternalShare = async () => {
    try {
      await Share.share({ message: `Check out this post from ${username}: https://yourapp.com/posts/${id}` });
    } catch {
      Alert.alert('Error', 'Could not share the post.');
    }
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(`https://yourapp.com/posts/${id}`);
    Alert.alert('Link Copied', 'The post link has been copied to your clipboard.');
  };

  const showShareMenu = () => {
    showActionSheetWithOptions(
      { options: ['Share Externally', 'Copy Link', 'Cancel'], cancelButtonIndex: 2 },
      (index) => {
        if (index === 0) handleExternalShare();
        if (index === 1) handleCopyLink();
      }
    );
  };

  // Three-dot options menu — shows Report for other users' posts
  const showOptionsMenu = () => {
    const isOwnPost = userId === currentUserId;
    if (isOwnPost) {
      // Own post options (can be expanded later e.g. Edit, Delete)
      showActionSheetWithOptions(
        { options: ['Cancel'], cancelButtonIndex: 0 },
        () => {}
      );
    } else {
      showActionSheetWithOptions(
        {
          options: ['Report', 'Cancel'],
          cancelButtonIndex: 1,
          destructiveButtonIndex: 0,
        },
        (index) => {
          if (index === 0) setReportModalVisible(true);
        }
      );
    }
  };

  const handleAuthorPress = () => {
    if (!userId) return;
    if (userId === currentUserId) router.push('/(tabs)/profile');
    else router.push(`/user/${userId}`);
  };

  const images = postImages && postImages.length > 0 ? postImages : postImage ? [postImage] : [];

  return (
    <View style={styles.container}>

      {/* Header: avatar + username + three-dot menu */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerLeft} onPress={handleAuthorPress}>
          <Image source={{ uri: profilePic }} style={styles.profilePic} />
          <Text style={styles.username}>{username}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionsBtn} onPress={showOptionsMenu}>
          <Text style={styles.optionsDots}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* Media */}
      {videoUrl ? (
        <VideoPlayer uri={videoUrl} height={300} autoplay showControls={false} />
      ) : (
        <ImageCarousel images={images} height={300} />
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => setLiked(!liked)}>
          <Text style={[styles.actionBtn, liked && styles.liked]}>{liked ? '❤️ Liked' : '🤍 Like'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => saved ? setSaved(false) : setCollectionModalVisible(true)}>
          <Text style={[styles.actionBtn, saved && styles.saved]}>{saved ? '🔖 Saved' : '📄 Save'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={showShareMenu}>
          <Text style={styles.actionBtn}>🔗 Share</Text>
        </TouchableOpacity>
      </View>

      {/* Caption */}
      <Text style={styles.caption}>
        <Text style={styles.username}>{username} </Text>
        {caption}
      </Text>

      {/* Tags */}
      {tags && tags.length > 0 && <TagDisplay tags={tags} />}

      <SaveCollectionModal
        visible={collectionModalVisible}
        onClose={() => setCollectionModalVisible(false)}
        onSave={handleSave}
      />

      {id && (
        <ReportModal
          visible={reportModalVisible}
          postId={id}
          onClose={() => setReportModalVisible(false)}
        />
      )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  optionsBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  optionsDots: {
    fontSize: 20,
    color: '#555',
    letterSpacing: 1,
  },
  actions: {
    flexDirection: 'row',
    padding: 10,
    gap: 16,
  },
  actionBtn: {
    fontSize: 15,
    color: '#333',
  },
  liked: { color: '#e0245e' },
  saved: { color: '#FF6B35' },
  caption: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: '#333',
  },
});
