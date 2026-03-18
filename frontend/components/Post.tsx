import React, { useState, useEffect, useRef } from 'react';
import SaveCollectionModal from "./SaveCollectionModal";
import * as Clipboard from 'expo-clipboard';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Collection, useCollections } from "../context/CollectionsContext";
import { Tag, Recipe, deletePost, fetchRecipe, likePost, unlikePost, reportContent, unsavePost, checkSaveStatus } from '../services/api';
import TagDisplay from './TagDisplay';
import RecipeDisplay from './RecipeDisplay';
import { colors } from '../constants/theme';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  Animated,
  ScrollView,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { router } from 'expo-router';

const CAPTION_MAX_LENGTH = 100;

function getRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  return date.toLocaleDateString();
}

interface PostProps {
  id?: string;
  profilePic: string;
  username: string;
  postImage: string;
  postImages?: string[];
  caption: string;
  userId?: string;
  currentUserId?: string;
  editedAt?: string | null;
  createdAt?: string | null;
  onDeleted?: (postId: string) => void;
  tags?: Tag[];
  initialLiked?: boolean;
  initialLikes?: number;
  verified?: boolean;
  mediaType?: 'image' | 'video';
  commentCount?: number;
}

export default function Post({
  id,
  profilePic,
  username,
  postImage,
  postImages,
  caption,
  userId,
  currentUserId,
  editedAt,
  createdAt,
  onDeleted,
  tags,
  initialLiked = false,
  initialLikes = 0,
  verified = false,
  mediaType = 'image',
  commentCount = 0,
}: PostProps) {
  const { savePostToCollection } = useCollections();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const allImages = postImages && postImages.length > 0 ? postImages : [postImage];
  const [likeLoading, setLikeLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [captionExpanded, setCaptionExpanded] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRecipe(id).then(setRecipe).catch(() => {});
      checkSaveStatus(id).then(({ isSaved }) => setSaved(isSaved)).catch(() => {});
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

  const handleSavePress = async () => {
    if (!id) return;
    if (saved) {
      setSaved(false);
      try {
        await unsavePost(id);
      } catch {
        setSaved(true);
        Alert.alert('Error', 'Could not unsave post. Please try again.');
      }
    } else {
      setCollectionModalVisible(true);
    }
  };

  const handleSave = async (collection: Collection) => {
    if (!id) return;
    setSaved(true);
    setCollectionModalVisible(false);
    try {
      await savePostToCollection(collection.id, id);
    } catch {
      setSaved(false);
      Alert.alert('Error', 'Could not save post to collection. Please try again.');
    }
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

  const submitReport = async (reason: string) => {
    if (!id) return;
    try {
      await reportContent('post', id, reason);
      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit report.');
    }
  };

  const handleReport = () => {
    if (!id) return;
    const reasons = ['Spam', 'Inappropriate', 'Harassment', 'Other'];
    Alert.alert('Report Post', 'Select a reason:', [
      ...reasons.map((reason) => ({
        text: reason,
        onPress: () => {
          if (reason === 'Other') {
            Alert.prompt(
              'Report Post',
              'Please describe the issue:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Submit',
                  onPress: (text?: string) => {
                    const detail = text?.trim();
                    submitReport(detail ? `Other: ${detail}` : 'Other');
                  },
                },
              ],
              'plain-text',
              '',
              'default'
            );
          } else {
            submitReport(reason);
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const handleEdit = () => {
    if (!id) return;
    router.push(`/edit-post?postId=${id}`);
  };

  const showPostMenu = () => {
    if (isOwner) {
      const options = ['Edit', 'Save', 'Delete', 'Cancel'];
      showActionSheetWithOptions(
        { options, cancelButtonIndex: 3, destructiveButtonIndex: 2 },
        (index) => {
          if (index === 0) handleEdit();
          if (index === 1) handleSavePress();
          if (index === 2) handleDelete();
        }
      );
    } else {
      const options = ['Save', 'Report', 'Cancel'];
      showActionSheetWithOptions(
        { options, cancelButtonIndex: 2, destructiveButtonIndex: 1 },
        (index) => {
          if (index === 0) handleSavePress();
          if (index === 1) handleReport();
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

  const isCaptionLong = caption && caption.length > CAPTION_MAX_LENGTH;
  const displayCaption = isCaptionLong && !captionExpanded
    ? caption.substring(0, CAPTION_MAX_LENGTH)
    : caption;

  const relativeTime = getRelativeTime(createdAt || editedAt);

  return (
    <View style={styles.container} accessible={true} accessibilityLabel={`Post by ${username}`}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerUserInfo}
          onPress={() => userId && router.push(`/(tabs)/feeds/user-profile?userId=${userId}`)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`View ${username}'s profile`}
        >
          <Image source={{ uri: profilePic }} style={styles.profilePic} />
          <View style={styles.headerTextContainer}>
            <View style={styles.usernameRow}>
              <Text style={styles.username}>{username}</Text>
              {verified && <Text style={styles.verifiedBadge}>{'\u2713'}</Text>}
            </View>
            {relativeTime ? (
              <Text style={styles.postedTime}>Posted {relativeTime}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuButton} onPress={showPostMenu} accessibilityRole="button" accessibilityLabel="Post options">
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {mediaType === 'video' ? (
        <PostVideo uri={allImages[0]} />
      ) : (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => id && router.push(`/post-detail?postId=${id}`)}
          accessibilityLabel={`Post by ${username}: ${caption?.substring(0, 80) || 'photo'}`}
        >
          {allImages.length > 1 ? (
            <View>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                  setActiveImageIndex(index);
                }}
              >
                {allImages.map((uri, index) => (
                  <Image key={index} source={{ uri }} style={styles.postImage} />
                ))}
              </ScrollView>
              <View style={styles.dotContainer}>
                {allImages.map((_, index) => (
                  <View
                    key={index}
                    style={[styles.dot, index === activeImageIndex && styles.dotActive]}
                  />
                ))}
              </View>
            </View>
          ) : (
            <Image source={{ uri: allImages[0] }} style={styles.postImage} />
          )}
        </TouchableOpacity>
      )}

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
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Ionicons
              name={liked ? 'thumbs-up' : 'thumbs-up-outline'}
              size={22}
              color={liked ? '#22C55E' : colors.textPrimary}
            />
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Dislike post"
        >
          <Ionicons name="thumbs-down-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => id && router.push(`/post-detail?postId=${id}`)}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel="Comment on post"
        >
          <Ionicons name="chatbubble-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={showShareMenu} style={styles.actionButton} accessibilityRole="button" accessibilityLabel="Share post">
          <Ionicons name="share-social-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.likeCount} accessibilityLabel={`${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`}>
        {likeCount > 0
          ? <>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</>
          : '0 likes'}
      </Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          if (isCaptionLong && !captionExpanded) {
            setCaptionExpanded(true);
          } else if (id) {
            router.push(`/post-detail?postId=${id}`);
          }
        }}
        accessibilityLabel={`${username}: ${caption}`}
      >
        <Text style={styles.caption}>
          <Text style={styles.captionUsername}>{username} </Text>
          {displayCaption}
          {isCaptionLong && !captionExpanded && (
            <Text style={styles.captionMore}>... more</Text>
          )}
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

function PostVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, p => {
    p.loop = false;
  });
  return (
    <VideoView
      player={player}
      style={{ width: SCREEN_WIDTH, aspectRatio: 4 / 3 }}
      allowsFullscreen
      allowsPictureInPicture
    />
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 10, backgroundColor: colors.backgroundPrimary, borderBottomWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  headerUserInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTextContainer: { flex: 1 },
  usernameRow: { flexDirection: 'row', alignItems: 'center' },
  profilePic: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  username: { fontWeight: 'bold', fontSize: 16 },
  postedTime: { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  menuButton: { padding: 8 },
  postImage: { width: SCREEN_WIDTH, aspectRatio: 1, backgroundColor: colors.borderLight },
  dotContainer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 8, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 8, height: 8, borderRadius: 4 },
  actions: { flexDirection: 'row', paddingHorizontal: 10, paddingTop: 10, gap: 18 },
  actionButton: { paddingVertical: 4 },
  likeCount: { paddingHorizontal: 10, paddingTop: 6, fontSize: 14, color: colors.textPrimary },
  likeCountBold: { fontWeight: 'bold' },
  caption: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 4, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  captionUsername: { fontWeight: 'bold' },
  captionMore: { color: '#B2B2B2' },
  verifiedBadge: { color: colors.verified, fontSize: 16, fontWeight: 'bold', marginLeft: 4 },
  editedLabel: { paddingHorizontal: 10, paddingBottom: 10, fontSize: 12, color: colors.textQuaternary, fontStyle: 'italic' },
});
