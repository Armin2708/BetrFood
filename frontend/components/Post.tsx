import React, { useState, useEffect } from 'react';
import SaveCollectionModal from "./SaveCollectionModal";
import * as Clipboard from 'expo-clipboard';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Collection } from "../context/CollectionsContext";
import { Tag, Recipe, deletePost, fetchRecipe, likePost, unlikePost, reportContent } from '../services/api';
import TagDisplay from './TagDisplay';
import RecipeDisplay from './RecipeDisplay';
import { colors } from '../constants/theme';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  Animated,
} from 'react-native';
import { router } from 'expo-router';

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
  verified?: boolean;
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
  verified = false,
}: PostProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [likeLoading, setLikeLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    if (id) {
      fetchRecipe(id).then(setRecipe).catch(() => {});
    }
  }, [id]);

  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const { showActionSheetWithOptions } = useActionSheet();

  const isOwner = currentUserId && userId && currentUserId === userId;

  const toggleLike = async () => {
    if (!id || likeLoading) return;

    const prevLiked = liked;
    const prevCount = likeCount;
    const newLiked = !liked;

    // Optimistic update
    setLiked(newLiked);
    setLikeCount((prev) => (newLiked ? prev + 1 : Math.max(0, prev - 1)));

    // Bounce animation
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.4, useNativeDriver: true, speed: 50 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }),
    ]).start();

    setLikeLoading(true);
    try {
      const data = newLiked ? await likePost(id) : await unlikePost(id);
      setLikeCount(data.likes);
    } catch {
      // Rollback on failure
      setLiked(prevLiked);
      setLikeCount(prevCount);
      Alert.alert('Error', 'Could not update like. Please try again.');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleSavePress = () => {
    if (!saved) setCollectionModalVisible(true);
    else setSaved(false);
  };

  const handleSave = (collection: Collection) => {
    setSaved(true);
    setCollectionModalVisible(false);
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert('Delete Post', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(id);
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
        message: `Check out this post from ${username}: betrfood://posts/${id}`,
      });
    } catch {
      Alert.alert('Error', 'Could not share the post.');
    }
  };

  const handleCopyLink = async () => {
    const link = `betrfood://posts/${id}`;
    await Clipboard.setStringAsync(link);
    Alert.alert('Link Copied', 'The post link has been copied to your clipboard.');
  };

  const handleReport = () => {
    if (!id) return;
    const reasons = ['Spam', 'Inappropriate', 'Harassment', 'Other'];
    Alert.alert('Report Post', 'Select a reason:', [
      ...reasons.map((reason) => ({
        text: reason,
        onPress: async () => {
          try {
            await reportContent('post', id, reason);
            Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit report.');
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const showPostMenu = () => {
    if (isOwner) {
      const options = ['Delete', 'Report', 'Cancel'];
      showActionSheetWithOptions(
        { options, cancelButtonIndex: 2, destructiveButtonIndex: 0 },
        (index) => {
          if (index === 0) handleDelete();
          if (index === 1) handleReport();
        }
      );
    } else {
      const options = ['Report', 'Cancel'];
      showActionSheetWithOptions(
        { options, cancelButtonIndex: 1, destructiveButtonIndex: 0 },
        (index) => {
          if (index === 0) handleReport();
        }
      );
    }
  };

  const showShareMenu = () => {
    const options = ['Share Externally', 'Copy Link', 'Cancel'];
    showActionSheetWithOptions({ options, cancelButtonIndex: 2 }, (index) => {
      if (index === 0) handleExternalShare();
      if (index === 1) handleCopyLink();
    });
  };

  return (
    <View style={styles.container} accessible={true} accessibilityLabel={`Post by ${username}`}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerUserInfo}
          onPress={() => userId && router.push(`/user-profile?userId=${userId}`)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`View ${username}'s profile`}
        >
          <Image source={{ uri: profilePic }} style={styles.profilePic} />
          <Text style={styles.username}>{username}</Text>
          {verified && <Text style={styles.verifiedBadge}>{'\u2713'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={showPostMenu} accessibilityRole="button" accessibilityLabel="Post options">
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => id && router.push(`/post-detail?postId=${id}`)}
        accessibilityLabel={`Post by ${username}: ${caption?.substring(0, 80) || 'photo'}`}
      >
        <Image source={{ uri: postImage }} style={styles.postImage} />
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={toggleLike}
          style={styles.actionButton}
          disabled={likeLoading}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={liked ? `Unlike post, ${likeCount} likes` : `Like post, ${likeCount} likes`}
          accessibilityState={{ selected: liked }}
        >
          <Animated.Text
            style={[
              styles.actionText,
              liked && styles.liked,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            {liked ? '❤️' : '🤍'} {liked ? 'Liked' : 'Like'}
          </Animated.Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSavePress}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove from saved' : 'Save post'}
          accessibilityState={{ selected: saved }}
        >
          <Text style={[styles.actionText, saved && styles.saved]}>
            {saved ? '🔖 Saved' : '🔖 Save'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={showShareMenu} style={styles.actionButton} accessibilityRole="button" accessibilityLabel="Share post">
          <Text style={styles.actionText}>🔗 Share</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.likeCount} accessibilityLabel={`${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`}>
        {likeCount} {likeCount === 1 ? 'like' : 'likes'}
      </Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => id && router.push(`/post-detail?postId=${id}`)}
        accessibilityLabel={`${username}: ${caption}`}
      >
        <Text style={styles.caption}>
          <Text style={styles.captionUsername}>{username} </Text>{caption}
        </Text>
      </TouchableOpacity>
      {editedAt && <Text style={styles.editedLabel}>Edited</Text>}

      {tags && tags.length > 0 && <TagDisplay tags={tags} />}

      {recipe && <RecipeDisplay recipe={recipe} />}

      <SaveCollectionModal
        visible={collectionModalVisible}
        onClose={() => setCollectionModalVisible(false)}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 10, backgroundColor: colors.backgroundPrimary, borderBottomWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  headerUserInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  profilePic: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  username: { fontWeight: 'bold', fontSize: 16, flex: 1 },
  menuButton: { padding: 8 },
  postImage: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.borderLight },
  actions: { flexDirection: 'row', paddingHorizontal: 10, paddingTop: 10, gap: 16 },
  actionButton: { paddingVertical: 4 },
  actionText: { fontSize: 16, color: colors.textPrimary },
  liked: { color: colors.liked, fontWeight: '600' },
  saved: { color: colors.info, fontWeight: '600' },
  likeCount: { paddingHorizontal: 10, paddingTop: 4, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  caption: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4, fontSize: 14, color: colors.textPrimary },
  captionUsername: { fontWeight: 'bold' },
  verifiedBadge: { color: colors.verified, fontSize: 16, fontWeight: 'bold', marginLeft: 4 },
  editedLabel: { paddingHorizontal: 10, paddingBottom: 10, fontSize: 12, color: colors.textQuaternary, fontStyle: 'italic' },
});
