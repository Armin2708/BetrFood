import React, { useState, useEffect } from 'react';
import SaveCollectionModal from "./SaveCollectionModal";
import * as Clipboard from 'expo-clipboard';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Collection, useCollections } from "../context/CollectionsContext";
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
  Modal,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';

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
  createdAt?: string;
  onDeleted?: (postId: string) => void;
  tags?: Tag[];
  initialLiked?: boolean;
  initialLikes?: number;
  verified?: boolean;
  mediaType?: 'image' | 'video';
  commentCount?: number;
  // Pantry match props
  isPantryMatch?: boolean;
  pantryMatchedCount?: number;
  pantryMissingCount?: number;
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
  mediaType,
  commentCount,
  isPantryMatch,
  pantryMatchedCount,
  pantryMissingCount,
}: PostProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [likeLoading, setLikeLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedInCollections, setSavedInCollections] = useState<Collection[]>([]);
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  const [removeCollectionModalVisible, setRemoveCollectionModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  const { savePostToCollection, collections, fetchPostsForCollection, removePostFromCollection } = useCollections();

  useEffect(() => {
    if (id) {
      fetchRecipe(id).then(setRecipe).catch(() => {});
    }
  }, [id]);

  // Check if this post is saved in any collection
  useEffect(() => {
    if (!id || collections.length === 0) return;
    let cancelled = false;
    const checkSaved = async () => {
      try {
        const matched: Collection[] = [];
        for (const collection of collections) {
          const posts = await fetchPostsForCollection(collection.id);
          if (posts.some((p: any) => p.id === id)) {
            matched.push(collection);
          }
        }
        if (!cancelled) {
          setSavedInCollections(matched);
          setSaved(matched.length > 0);
        }
      } catch {
        // silently ignore
      }
    };
    checkSaved();
    return () => { cancelled = true; };
  }, [id, collections]);

  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const { showActionSheetWithOptions } = useActionSheet();

  const isOwner = currentUserId && userId && currentUserId === userId;

  const toggleLike = async () => {
    if (!id || likeLoading) return;

    const prevLiked = liked;
    const prevCount = likeCount;
    const newLiked = !liked;

    setLiked(newLiked);
    setLikeCount((prev) => (newLiked ? prev + 1 : Math.max(0, prev - 1)));

    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.4, useNativeDriver: true, speed: 50 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }),
    ]).start();

    setLikeLoading(true);
    try {
      const data = newLiked ? await likePost(id) : await unlikePost(id);
      setLikeCount(data.likes);
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      Alert.alert('Error', 'Could not update like. Please try again.');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleSavePress = () => {
    if (!saved) {
      setCollectionModalVisible(true);
    } else {
      setRemoveCollectionModalVisible(true);
    }
  };

  const handleRemoveFromCollection = async (selectedCollections: Collection[]) => {
    if (!id || selectedCollections.length === 0) return;
    setRemoveCollectionModalVisible(false);
    try {
      await Promise.all(selectedCollections.map(c => removePostFromCollection(c.id, id)));
      const removedIds = new Set(selectedCollections.map(c => c.id));
      const remaining = savedInCollections.filter(c => !removedIds.has(c.id));
      setSavedInCollections(remaining);
      setSaved(remaining.length > 0);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to remove from collection.');
    }
  };

  const handleSave = async (selectedCollections: Collection[]) => {
    if (!id || selectedCollections.length === 0) return;
    setSaved(true);
    setCollectionModalVisible(false);
    try {
      await Promise.all(selectedCollections.map(c => savePostToCollection(c.id, id)));
      setSavedInCollections(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const newOnes = selectedCollections.filter(c => !existingIds.has(c.id));
        return [...prev, ...newOnes];
      });
    } catch (error: any) {
      setSaved(false);
      Alert.alert('Error', error.message || 'Failed to save post.');
    }
  };

  const handleDelete = () => {
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!id) return;
    setDeleteModalVisible(false);
    try {
      await deletePost(id);
      if (onDeleted) onDeleted(id);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete post.');
    }
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

  const REPORT_REASONS = ['Spam', 'Inappropriate', 'Harassment', 'Other'];

  const handleReport = () => {
    if (!id) return;
    setReportReason(null);
    setReportModalVisible(true);
  };

  const submitReport = async () => {
    if (!id || !reportReason) return;
    setReportModalVisible(false);
    try {
      await reportContent('post', id, reportReason);
      Alert.alert('Report Submitted', 'Thank you for your report. We will review it shortly.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit report.');
    }
  };

  const showPostMenu = () => {
    if (isOwner) {
      const options = ['Edit', 'Delete', 'Report', 'Cancel'];
      showActionSheetWithOptions(
        { options, cancelButtonIndex: 3, destructiveButtonIndex: 1 },
        (index) => {
          if (index === 0) router.push(`/edit-post?postId=${id}`);
          if (index === 1) handleDelete();
          if (index === 2) handleReport();
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

  // Only show pantry badge when we have match data
  const showPantryBadge =
    isPantryMatch !== undefined &&
    pantryMatchedCount !== undefined &&
    pantryMissingCount !== undefined;

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
        <TouchableOpacity
          style={styles.menuButton}
          onPress={showPostMenu}
          accessibilityRole="button"
          accessibilityLabel="Post options"
        >
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

        <TouchableOpacity
          onPress={showShareMenu}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel="Share post"
        >
          <Text style={styles.actionText}>🔗 Share</Text>
        </TouchableOpacity>
      </View>

      <Text
        style={styles.likeCount}
        accessibilityLabel={`${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`}
      >
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
      {editedAt && (
        <Text style={styles.editedLabel}>
          <Ionicons name="pencil-outline" size={11} color={colors.textQuaternary} /> Edited {new Date(editedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </Text>
      )}

      {tags && tags.length > 0 && <TagDisplay tags={tags} />}

      {/* ── Pantry match badge ─────────────────────────────────────────── */}
      {showPantryBadge && (
        <View
          style={[
            styles.pantryBadge,
            isPantryMatch ? styles.pantryBadgeMatch : styles.pantryBadgePartial,
          ]}
          accessible
          accessibilityLabel={
            isPantryMatch
              ? `Pantry match: ${pantryMatchedCount} ingredients in your pantry, ${pantryMissingCount} needed`
              : `Partial match: ${pantryMatchedCount} ingredients in your pantry, ${pantryMissingCount} missing`
          }
        >
          <Ionicons
            name={isPantryMatch ? 'checkmark-circle' : 'basket-outline'}
            size={14}
            color={isPantryMatch ? '#16A34A' : '#92400E'}
          />
          <Text
            style={[
              styles.pantryBadgeText,
              isPantryMatch ? styles.pantryBadgeTextMatch : styles.pantryBadgeTextPartial,
            ]}
          >
            {isPantryMatch ? '✓ Pantry match · ' : ''}
            {pantryMatchedCount} in pantry
            {(pantryMissingCount ?? 0) > 0
              ? ` · ${pantryMissingCount} needed`
              : ''}
          </Text>
        </View>
      )}

      {recipe && <RecipeDisplay recipe={recipe} />}

      <SaveCollectionModal
        visible={collectionModalVisible}
        onClose={() => setCollectionModalVisible(false)}
        onSave={handleSave}
        mode="save"
      />

      <SaveCollectionModal
        visible={removeCollectionModalVisible}
        onClose={() => setRemoveCollectionModalVisible(false)}
        onSave={handleSave}
        onRemove={handleRemoveFromCollection}
        mode="remove"
        savedInCollections={savedInCollections}
      />

      {/* Delete confirmation modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDeleteModalVisible(false)}>
          <Pressable style={styles.modalBox} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Delete Post</Text>
            <Text style={styles.modalMessage}>Are you sure you want to delete this post? This cannot be undone.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={confirmDelete}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Report modal */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setReportModalVisible(false)}>
          <Pressable style={styles.modalBox} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Report Post</Text>
            <Text style={styles.modalMessage}>Select a reason for reporting this post:</Text>
            {REPORT_REASONS.map(reason => (
              <TouchableOpacity
                key={reason}
                style={[styles.reportReasonButton, reportReason === reason && styles.reportReasonButtonActive]}
                onPress={() => setReportReason(reason)}
              >
                <Text style={[styles.reportReasonText, reportReason === reason && styles.reportReasonTextActive]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={[styles.modalButtons, { marginTop: 16 }]}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setReportModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDeleteButton, !reportReason && styles.modalButtonDisabled]}
                onPress={submitReport}
                disabled={!reportReason}
              >
                <Text style={styles.modalDeleteText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    backgroundColor: colors.backgroundPrimary,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
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
  likeCount: {
    paddingHorizontal: 10,
    paddingTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  caption: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    fontSize: 14,
    color: colors.textPrimary,
  },
  captionUsername: { fontWeight: 'bold' },
  verifiedBadge: {
    color: colors.verified,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  editedLabel: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    fontSize: 12,
    color: colors.textQuaternary,
    fontStyle: 'italic',
  },
  // Pantry match badge
  pantryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginHorizontal: 10,
    marginTop: 6,
    marginBottom: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  pantryBadgeMatch: {
    backgroundColor: '#DCFCE7',
  },
  pantryBadgePartial: {
    backgroundColor: '#FEF3C7',
  },
  pantryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pantryBadgeTextMatch: {
    color: '#16A34A',
  },
  pantryBadgeTextPartial: {
    color: '#92400E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    width: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
  },
  modalDeleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  modalButtonDisabled: {
    opacity: 0.4,
  },
  reportReasonButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  reportReasonButtonActive: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  reportReasonText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  reportReasonTextActive: {
    color: '#22C55E',
    fontWeight: '700',
  },
});
