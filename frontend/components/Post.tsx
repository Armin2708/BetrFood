import React, { useState, useEffect, useRef, useContext } from 'react';
import SaveCollectionModal from "./SaveCollectionModal";
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Collection, useCollections } from "../context/CollectionsContext";
import { Tag, Recipe, Comment, deletePost, fetchRecipe, likePost, unlikePost, reportContent, fetchComments, createComment, deleteComment, checkSaveStatus, blockUser, unblockUser, muteUser, unmuteUser, checkBlockStatus, checkMuteStatus } from '../services/api';
import { feedEvents, collectionEvents } from '../utils/feedEvents';
import TagDisplay from './TagDisplay';
import RecipeDisplay from './RecipeDisplay';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors } from '../constants/theme';
import { AuthContext } from '../context/AuthenticationContext';
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
  TextInput,
  ActivityIndicator,
  FlatList,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
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
  hasRecipe?: boolean;
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
  hasRecipe,
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
  const [avatarError, setAvatarError] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentTotal, setCommentTotal] = useState(0);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsOffset, setCommentsOffset] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const commentSlideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareModalShown, setShareModalShown] = useState(false);
  const shareSlideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const [menuModalShown, setMenuModalShown] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const menuSlideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const commentInputRef = useRef<TextInput>(null);
  const { user } = useContext(AuthContext);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    confirmColor?: string;
    onConfirm: () => void;
  }>({ visible: false, title: '', message: '', confirmText: '', onConfirm: () => {} });

  useEffect(() => {
    if (!userId || !user || user.id === userId) return;
    let cancelled = false;
    Promise.all([
      checkBlockStatus(userId).catch(() => ({ isBlocked: false })),
      checkMuteStatus(userId).catch(() => ({ isMuted: false })),
    ]).then(([blockRes, muteRes]) => {
      if (!cancelled) {
        setIsBlocked(blockRes.isBlocked);
        setIsMuted(muteRes.isMuted);
      }
    });
    return () => { cancelled = true; };
  }, [userId, user]);

  const COMMENTS_LIMIT = 20;

  const { savePostToCollection, collections, fetchPostsForCollection, removePostFromCollection } = useCollections();

  useEffect(() => {
    if (id && hasRecipe !== false) {
      fetchRecipe(id).then(r => { if (r) setRecipe(r); }).catch(() => {});
    }
  }, [id, hasRecipe]);

  const loadComments = async (offset: number) => {
    if (!id) return;
    try {
      setCommentsLoading(true);
      const data = await fetchComments(id, offset, COMMENTS_LIMIT);
      if (offset === 0) {
        setComments(data.comments);
      } else {
        setComments((prev) => [...prev, ...data.comments]);
      }
      setCommentTotal(data.total);
      setCommentsOffset(offset + data.comments.length);
      setHasMoreComments(offset + data.comments.length < data.total);
    } catch {
      // silently fail
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleOpenComments = () => {
    if (comments.length === 0) {
      loadComments(0);
    }
    setCommentsModalVisible(true);
    setShowComments(true);
    Animated.spring(commentSlideAnim, {
      toValue: 0,
      useNativeDriver: true,
      speed: 14,
      bounciness: 4,
    }).start();
  };

  const handleCloseComments = () => {
    Animated.timing(commentSlideAnim, {
      toValue: Dimensions.get('window').height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setCommentsModalVisible(false);
      setShowComments(false);
      setReplyTarget(null);
    });
  };

  const handleSubmitComment = async () => {
    if (!id || !commentText.trim() || submittingComment) return;
    try {
      setSubmittingComment(true);
      await createComment(id, commentText.trim(), replyTarget?.id);
      setCommentText('');
      setReplyTarget(null);
      await loadComments(0);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(commentId);
            await loadComments(0);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete comment.');
          }
        },
      },
    ]);
  };

  const handleReply = (comment: Comment) => {
    setReplyTarget(comment);
    setTimeout(() => commentInputRef.current?.focus(), 100);
  };

  const formatCommentTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderComment = (comment: Comment, depth: number = 0) => {
    const isCommentOwner = user && user.id === comment.userId;
    const maxIndent = 3;
    const indentLevel = Math.min(depth, maxIndent);

    return (
      <View key={comment.id}>
        <View style={[styles.commentItem, { marginLeft: indentLevel * 24 }]}>
          <TouchableOpacity
            onPress={() => router.push(`/feeds/user-profile?userId=${comment.userId}`)}
            accessibilityRole="button"
            accessibilityLabel={`View ${comment.displayName || comment.username || 'user'}'s profile`}
          >
            {comment.avatarUrl ? (
              <Image source={{ uri: comment.avatarUrl }} style={styles.commentAvatar} />
            ) : (
              <View style={[styles.commentAvatar, styles.commentAvatarPlaceholder]}>
                <Text style={styles.commentAvatarText}>
                  {(comment.displayName || comment.username || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.commentBody}>
            <View style={styles.commentHeader}>
              <TouchableOpacity
                onPress={() => router.push(`/feeds/user-profile?userId=${comment.userId}`)}
                accessibilityRole="button"
                accessibilityLabel={`View ${comment.displayName || comment.username || 'user'}'s profile`}
              >
                <Text style={styles.commentUsername}>
                  {comment.displayName || comment.username || 'User'}
                </Text>
              </TouchableOpacity>
              {comment.verified && <Text style={styles.commentVerifiedBadge}>{'\u2713'}</Text>}
              <Text style={styles.commentTime}>{formatCommentTime(comment.createdAt)}</Text>
            </View>

            <Text style={styles.commentContent}>{comment.content}</Text>

            <View style={styles.commentActions}>
              <TouchableOpacity onPress={() => handleReply(comment)} style={styles.commentActionBtn} accessibilityRole="button" accessibilityLabel={`Reply to ${comment.displayName || comment.username || 'user'}`}>
                <Text style={styles.commentActionText}>Reply</Text>
              </TouchableOpacity>
              {isCommentOwner && (
                <TouchableOpacity
                  onPress={() => handleDeleteComment(comment.id)}
                  style={styles.commentActionBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Delete comment"
                >
                  <Text style={[styles.commentActionText, styles.commentDeleteText]}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {comment.replies && comment.replies.length > 0 &&
          comment.replies.map((reply) => renderComment(reply, depth + 1))
        }
      </View>
    );
  };

  // Check if this post is saved (lightweight single API call)
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    checkSaveStatus(id)
      .then(({ isSaved }) => { if (!cancelled) setSaved(isSaved); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  // Listen for collection changes that affect this post's save status
  useEffect(() => {
    if (!id) return;
    const unsubscribe = collectionEvents.onPostSaveStatusChange((postId) => {
      if (postId === id) {
        // Refresh save status when a post is removed from a collection
        checkSaveStatus(id)
          .then(({ isSaved }) => setSaved(isSaved))
          .catch(() => {});
      }
    });
    return unsubscribe;
  }, [id]);

  const scaleAnim = React.useRef(new Animated.Value(1)).current;

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

  const handleSavePress = async () => {
    if (!saved) {
      setCollectionModalVisible(true);
    } else {
      // Lazily load which collections this post is in
      if (id && collections.length > 0) {
        try {
          const matched: Collection[] = [];
          for (const collection of collections) {
            const posts = await fetchPostsForCollection(collection.id);
            if (posts.some((p: any) => p.id === id)) {
              matched.push(collection);
            }
          }
          setSavedInCollections(matched);
        } catch {}
      }
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
        message: `Check out this post from ${username} on BetrFood!`,
      });
    } catch {
      Alert.alert('Error', 'Could not share the post.');
    }
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(caption || 'Check out this post on BetrFood!');
    Alert.alert('Copied', 'Post text has been copied to your clipboard.');
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

  const handleOpenMenu = () => {
    setMenuModalShown(true);
    setMenuModalVisible(true);
    Animated.spring(menuSlideAnim, {
      toValue: 0,
      useNativeDriver: true,
      speed: 14,
      bounciness: 4,
    }).start();
  };

  const handleCloseMenu = () => {
    Animated.timing(menuSlideAnim, {
      toValue: Dimensions.get('window').height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setMenuModalShown(false);
      setMenuModalVisible(false);
    });
  };

  const showConfirm = (title: string, message: string, confirmText: string, onConfirm: () => void, confirmColor?: string) => {
    if (Platform.OS === 'web') {
      setConfirmModal({ visible: true, title, message, confirmText, confirmColor, onConfirm });
    } else {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: confirmText, style: confirmColor === '#DC2626' ? 'destructive' : 'default', onPress: onConfirm },
      ]);
    }
  };

  const handleToggleBlock = () => {
    if (!userId) return;
    const blocked = isBlocked;
    const uid = userId;
    setMenuModalShown(false);
    setMenuModalVisible(false);
    setTimeout(() => {
      if (blocked) {
        showConfirm('Unblock User', 'Are you sure you want to unblock this user?', 'Unblock', async () => {
          setConfirmModal(prev => ({ ...prev, visible: false }));
          try {
            await unblockUser(uid);
            setIsBlocked(false);
            feedEvents.emitRefreshNeeded();
          } catch (error: any) {
            showConfirm('Error', error.message || 'Failed to unblock user.', 'OK', () => setConfirmModal(prev => ({ ...prev, visible: false })));
          }
        }, '#16A34A');
      } else {
        showConfirm('Block User', 'Are you sure you want to block this user? You won\'t see their content and they won\'t see yours.', 'Block', async () => {
          setConfirmModal(prev => ({ ...prev, visible: false }));
          try {
            await blockUser(uid);
            setIsBlocked(true);
            feedEvents.emitRefreshNeeded();
          } catch (error: any) {
            showConfirm('Error', error.message || 'Failed to block user.', 'OK', () => setConfirmModal(prev => ({ ...prev, visible: false })));
          }
        }, '#DC2626');
      }
    }, 400);
  };

  const handleToggleMute = () => {
    if (!userId) return;
    const muted = isMuted;
    const uid = userId;
    setMenuModalShown(false);
    setMenuModalVisible(false);
    setTimeout(() => {
      if (muted) {
        showConfirm('Unmute User', 'You will see this user\'s posts in your feed again.', 'Unmute', async () => {
          setConfirmModal(prev => ({ ...prev, visible: false }));
          try {
            await unmuteUser(uid);
            setIsMuted(false);
            feedEvents.emitRefreshNeeded();
          } catch (error: any) {
            showConfirm('Error', error.message || 'Failed to unmute user.', 'OK', () => setConfirmModal(prev => ({ ...prev, visible: false })));
          }
        }, '#16A34A');
      } else {
        showConfirm('Mute User', 'You will no longer see this user\'s posts in your feed.', 'Mute', async () => {
          setConfirmModal(prev => ({ ...prev, visible: false }));
          try {
            await muteUser(uid);
            setIsMuted(true);
            feedEvents.emitRefreshNeeded();
          } catch (error: any) {
            showConfirm('Error', error.message || 'Failed to mute user.', 'OK', () => setConfirmModal(prev => ({ ...prev, visible: false })));
          }
        }, '#D97706');
      }
    }, 400);
  };

  const handleOpenShare = () => {
    setShareModalShown(true);
    setShareModalVisible(true);
    Animated.spring(shareSlideAnim, {
      toValue: 0,
      useNativeDriver: true,
      speed: 14,
      bounciness: 4,
    }).start();
  };

  const handleCloseShare = () => {
    Animated.timing(shareSlideAnim, {
      toValue: Dimensions.get('window').height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShareModalShown(false);
      setShareModalVisible(false);
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
          onPress={() => {
            if (!userId) return;
            if (currentUserId && currentUserId === userId) {
              router.push('/(tabs)/profile');
            } else {
              router.push(`/feeds/user-profile?userId=${userId}`);
            }
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`View ${username}'s profile`}
        >
          {!avatarError ? (
            <Image source={{ uri: profilePic }} style={styles.profilePic} onError={() => setAvatarError(true)} />
          ) : (
            <View style={[styles.profilePic, styles.profilePicFallback]}>
              <Text style={styles.profilePicFallbackText}>{(username || '?').charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.username}>{username}</Text>
          {verified && <Text style={styles.verifiedBadge}>{'\u2713'}</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={handleOpenMenu}
          accessibilityRole="button"
          accessibilityLabel="Post options"
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {mediaType === 'video' ? (
        <PostVideo uri={postImage} />
      ) : (
        <Image source={{ uri: postImage }} style={styles.postImage} accessibilityLabel={`Post by ${username}: ${caption?.substring(0, 80) || 'photo'}`} />
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
              name={liked ? 'heart' : 'heart-outline'}
              size={22}
              color={liked ? '#EF4444' : colors.textPrimary}
            />
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleOpenComments}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel={`${commentCount ?? commentTotal} comments`}
        >
          <Ionicons name="chatbubble-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSavePress}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove from saved' : 'Save post'}
          accessibilityState={{ selected: saved }}
        >
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={saved ? '#22C55E' : colors.textPrimary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleOpenShare}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel="Share post"
        >
          <Ionicons name="share-social-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (!id) return;
            router.push({
              pathname: '/(tabs)/chat/[id]',
              params: {
                id: 'new',
                title: `Chat about ${username}'s post`,
                postContext: encodeURIComponent(JSON.stringify({
                  postId: id,
                  caption: caption,
                  username: username,
                  tags: tags?.map(t => t.name) || [],
                })),
              },
            });
          }}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel="Ask AI about this post"
        >
          <Ionicons name="sparkles-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <Text
        style={styles.likeCount}
        accessibilityLabel={`${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`}
      >
        {likeCount} {likeCount === 1 ? 'like' : 'likes'}
      </Text>

      <Text style={styles.caption}>
        <Text style={styles.captionUsername}>{username} </Text>{caption}
      </Text>

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

      {/* View comments link */}
      {(commentCount ?? commentTotal) > 0 && (
        <TouchableOpacity onPress={handleOpenComments} style={styles.viewCommentsButton}>
          <Text style={styles.viewCommentsText}>
            View {commentCount ?? commentTotal} {(commentCount ?? commentTotal) === 1 ? 'comment' : 'comments'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Comments Bottom Sheet Modal */}
      <Modal
        visible={commentsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseComments}
      >
        <Pressable style={styles.commentsModalOverlay} onPress={handleCloseComments}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.commentsModalKeyboard}
          >
            <Animated.View style={[styles.commentsModalSheet, { transform: [{ translateY: commentSlideAnim }] }]}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                {/* Drag handle */}
                <View style={styles.commentsModalHandle} />

                {/* Header */}
                <View style={styles.commentsModalHeader}>
                  <Text style={styles.commentsModalTitle}>Comments</Text>
                  <TouchableOpacity onPress={handleCloseComments} style={styles.commentsModalClose}>
                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </Pressable>

              {/* Comments list */}
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderComment(item, 0)}
                style={styles.commentsModalList}
                contentContainerStyle={styles.commentsModalListContent}
                ListEmptyComponent={
                  !commentsLoading ? (
                    <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
                  ) : null
                }
                ListFooterComponent={
                  <>
                    {commentsLoading && (
                      <ActivityIndicator size="small" color={colors.primary} style={styles.commentsLoader} />
                    )}
                    {hasMoreComments && !commentsLoading && (
                      <TouchableOpacity onPress={() => loadComments(commentsOffset)} style={styles.loadMoreButton}>
                        <Text style={styles.loadMoreText}>Load more comments</Text>
                      </TouchableOpacity>
                    )}
                  </>
                }
              />

              {/* Comment Input */}
              <View style={styles.commentsModalInputContainer}>
                {replyTarget && (
                  <View style={styles.replyIndicator}>
                    <Text style={styles.replyIndicatorText} numberOfLines={1}>
                      Replying to @{replyTarget.username || replyTarget.displayName || 'User'}
                    </Text>
                    <TouchableOpacity onPress={() => setReplyTarget(null)}>
                      <Text style={styles.replyCancel}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.commentInputRow}>
                  <TextInput
                    ref={commentInputRef}
                    style={styles.commentInput}
                    placeholder="Add a comment..."
                    placeholderTextColor={colors.placeholder}
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    maxLength={1000}
                  />
                  <TouchableOpacity
                    onPress={handleSubmitComment}
                    disabled={!commentText.trim() || submittingComment}
                    style={[styles.sendButton, (!commentText.trim() || submittingComment) && styles.sendButtonDisabled]}
                  >
                    {submittingComment ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Ionicons name="arrow-up" size={20} color={colors.white} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Share Bottom Sheet Modal */}
      <Modal
        visible={shareModalShown}
        transparent
        animationType="fade"
        onRequestClose={handleCloseShare}
      >
        <Pressable style={styles.commentsModalOverlay} onPress={handleCloseShare}>
          <Animated.View style={[styles.shareModalSheet, { transform: [{ translateY: shareSlideAnim }] }]}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.commentsModalHandle} />
              <View style={styles.commentsModalHeader}>
                <Text style={styles.commentsModalTitle}>Share</Text>
                <TouchableOpacity onPress={handleCloseShare} style={styles.commentsModalClose}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => { handleCloseShare(); handleExternalShare(); }}
                activeOpacity={0.7}
              >
                <View style={styles.shareOptionIcon}>
                  <Ionicons name="share-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.shareOptionText}>Share Externally</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => { handleCloseShare(); handleCopyLink(); }}
                activeOpacity={0.7}
              >
                <View style={styles.shareOptionIcon}>
                  <Ionicons name="link-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.shareOptionText}>Copy Link</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleCloseShare} style={styles.shareCancel}>
                <Text style={styles.shareCancelText}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Post Menu Bottom Sheet Modal */}
      <Modal
        visible={menuModalShown}
        transparent
        animationType="fade"
        onRequestClose={handleCloseMenu}
      >
        <Pressable style={styles.commentsModalOverlay} onPress={handleCloseMenu}>
          <Animated.View style={[styles.shareModalSheet, { transform: [{ translateY: menuSlideAnim }] }]}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.commentsModalHandle} />
              <View style={styles.commentsModalHeader}>
                <Text style={styles.commentsModalTitle}>Options</Text>
                <TouchableOpacity onPress={handleCloseMenu} style={styles.commentsModalClose}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {isOwner && (
                <TouchableOpacity
                  style={styles.shareOption}
                  onPress={() => { handleCloseMenu(); router.push(`/edit-post?postId=${id}`); }}
                  activeOpacity={0.7}
                >
                  <View style={styles.shareOptionIcon}>
                    <Ionicons name="create-outline" size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.shareOptionText}>Edit</Text>
                </TouchableOpacity>
              )}

              {isOwner && (
                <TouchableOpacity
                  style={styles.shareOption}
                  onPress={() => { handleCloseMenu(); handleDelete(); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.shareOptionIcon, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="trash-outline" size={22} color="#e74c3c" />
                  </View>
                  <Text style={[styles.shareOptionText, { color: '#e74c3c' }]}>Delete</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => { handleCloseMenu(); handleReport(); }}
                activeOpacity={0.7}
              >
                <View style={[styles.shareOptionIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="flag-outline" size={22} color="#D97706" />
                </View>
                <Text style={styles.shareOptionText}>Report</Text>
              </TouchableOpacity>

              {!isOwner && userId && (
                <TouchableOpacity
                  style={styles.shareOption}
                  onPress={() => {
                    console.log('[BLOCK-UI] Block button PRESSED, userId:', userId, 'isOwner:', isOwner);
                    handleToggleBlock();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.shareOptionIcon, { backgroundColor: isBlocked ? '#F0FDF4' : '#FEE2E2' }]}>
                    <Ionicons name={isBlocked ? 'checkmark-circle-outline' : 'ban-outline'} size={22} color={isBlocked ? '#16A34A' : '#DC2626'} />
                  </View>
                  <Text style={[styles.shareOptionText, { color: isBlocked ? '#16A34A' : '#DC2626' }]}>
                    {isBlocked ? 'Unblock' : 'Block'}
                  </Text>
                </TouchableOpacity>
              )}

              {!isOwner && userId && (
                <TouchableOpacity
                  style={styles.shareOption}
                  onPress={() => {
                    console.log('[MUTE-UI] Mute button PRESSED, userId:', userId, 'isOwner:', isOwner);
                    handleToggleMute();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.shareOptionIcon, { backgroundColor: isMuted ? '#F0FDF4' : '#FEF3C7' }]}>
                    <Ionicons name={isMuted ? 'checkmark-circle-outline' : 'volume-mute-outline'} size={22} color={isMuted ? '#16A34A' : '#D97706'} />
                  </View>
                  <Text style={[styles.shareOptionText, { color: isMuted ? '#16A34A' : '#D97706' }]}>
                    {isMuted ? 'Unmute' : 'Mute'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={handleCloseMenu} style={styles.shareCancel}>
                <Text style={styles.shareCancelText}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

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

      {/* Confirm modal (block/mute/unblock/unmute) */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setConfirmModal(prev => ({ ...prev, visible: false }))}>
          <Pressable style={styles.modalBox} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{confirmModal.title}</Text>
            <Text style={styles.modalMessage}>{confirmModal.message}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDeleteButton, confirmModal.confirmColor ? { backgroundColor: confirmModal.confirmColor } : undefined]}
                onPress={confirmModal.onConfirm}
              >
                <Text style={styles.modalDeleteText}>{confirmModal.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function PostVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, p => {
    p.loop = false;
  });
  return (
    <View style={{ width: '100%', aspectRatio: 9 / 16, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
      <VideoView
        player={player}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        allowsFullscreen
        allowsPictureInPicture
      />
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
  profilePicFallback: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicFallbackText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
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
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
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
  // Comments
  viewCommentsButton: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  viewCommentsText: {
    fontSize: 14,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  // Comments modal (bottom sheet)
  commentsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  commentsModalKeyboard: {
    justifyContent: 'flex-end',
    maxHeight: '100%',
  },
  commentsModalSheet: {
    backgroundColor: colors.backgroundPrimary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: Dimensions.get('window').height * 0.75,
    minHeight: Dimensions.get('window').height * 0.45,
  },
  commentsModalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  commentsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  commentsModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  commentsModalClose: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  commentsModalList: {
    flex: 1,
  },
  commentsModalListContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  commentsModalInputContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: colors.backgroundPrimary,
  },
  noCommentsText: {
    fontSize: 14,
    color: colors.textQuaternary,
    textAlign: 'center',
    paddingVertical: 32,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    backgroundColor: colors.borderLight,
  },
  commentAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  commentAvatarText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.white,
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: 8,
  },
  commentVerifiedBadge: {
    color: colors.verified,
    fontSize: 13,
    fontWeight: 'bold' as const,
    marginRight: 4,
  },
  commentTime: {
    fontSize: 12,
    color: colors.textQuaternary,
  },
  commentContent: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 16,
  },
  commentActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  commentActionText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  commentDeleteText: {
    color: colors.delete,
  },
  commentsLoader: {
    paddingVertical: 12,
  },
  loadMoreButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.backgroundSubtle,
    borderRadius: 8,
    marginBottom: 6,
  },
  replyIndicatorText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  replyCancel: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
  // Share modal
  shareModalSheet: {
    backgroundColor: colors.backgroundPrimary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  shareOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  shareOptionText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  shareCancel: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  shareCancelText: {
    fontSize: 15,
    color: colors.textTertiary,
    fontWeight: '500',
  },
});
