import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  Animated,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useActionSheet } from '@expo/react-native-action-sheet';
import {
  fetchPost,
  fetchRecipe,
  fetchPostTags,
  getImageUrl,
  deletePost,
  likePost,
  unlikePost,
  unsavePost,
  checkSaveStatus,
  addPostToCollection,
  fetchComments,
  createComment,
  deleteComment,
  Post,
  Recipe,
  Tag,
  Comment,
} from '../services/api';
import SaveCollectionModal from '../components/SaveCollectionModal';
import { Collection } from '../context/CollectionsContext';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AuthContext } from '../context/AuthenticationContext';
import TagDisplay from '../components/TagDisplay';
import RecipeDisplay from '../components/RecipeDisplay';
import { colors } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { user } = useContext(AuthContext);

  const [post, setPost] = useState<Post | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentTotal, setCommentTotal] = useState(0);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsOffset, setCommentsOffset] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const commentInputRef = useRef<TextInput>(null);

  const COMMENTS_LIMIT = 20;

  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const { showActionSheetWithOptions } = useActionSheet();

  useEffect(() => {
    if (!postId) return;
    loadData();
  }, [postId]);

  async function loadData() {
    try {
      setLoading(true);
      const [postData, tagsData, saveStatus] = await Promise.all([
        fetchPost(postId!),
        fetchPostTags(postId!),
        checkSaveStatus(postId!).catch(() => ({ isSaved: false })),
      ]);
      setPost(postData);
      setTags(tagsData);
      setSaved(saveStatus.isSaved);

      // Try to load recipe
      try {
        const recipeData = await fetchRecipe(postId!);
        setRecipe(recipeData);
      } catch {
        // No recipe exists
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load post.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Load comments when post loads
  useEffect(() => {
    if (!postId) return;
    loadComments(0);
  }, [postId]);

  async function loadComments(offset: number) {
    if (!postId) return;
    try {
      setCommentsLoading(true);
      const data = await fetchComments(postId, offset, COMMENTS_LIMIT);
      if (offset === 0) {
        setComments(data.comments);
      } else {
        setComments((prev) => [...prev, ...data.comments]);
      }
      setCommentTotal(data.total);
      setCommentsOffset(offset + data.comments.length);
      setHasMoreComments(offset + data.comments.length < data.total);
    } catch {
      // Silently fail - comments are non-critical
    } finally {
      setCommentsLoading(false);
    }
  }

  const handleLoadMoreComments = () => {
    if (!commentsLoading && hasMoreComments) {
      loadComments(commentsOffset);
    }
  };

  const handleSubmitComment = async () => {
    if (!postId || !commentText.trim() || submittingComment) return;
    try {
      setSubmittingComment(true);
      const newComment = await createComment(
        postId,
        commentText.trim(),
        replyTarget?.id
      );
      // Reload comments from scratch to get proper nesting
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
    commentInputRef.current?.focus();
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

  const isOwner = user && post && user.id === post.userId;

  const imageUri = post
    ? post.imagePath.startsWith('http')
      ? post.imagePath
      : getImageUrl(post.imagePath)
    : '';

  const allImages = post?.images && post.images.length > 0
    ? post.images.map(p => p.startsWith('http') ? p : getImageUrl(p))
    : imageUri ? [imageUri] : [];
  const [activeDetailImage, setActiveDetailImage] = useState(0);

  const toggleLike = async () => {
    if (!postId || likeLoading) return;

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
      const data = newLiked ? await likePost(postId) : await unlikePost(postId);
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
    if (!postId) return;
    if (saved) {
      setSaved(false);
      try {
        await unsavePost(postId);
      } catch {
        setSaved(true);
        Alert.alert('Error', 'Could not unsave post. Please try again.');
      }
    } else {
      setCollectionModalVisible(true);
    }
  };

  const handleSaveToCollection = async (collection: Collection) => {
    if (!postId) return;
    setSaved(true);
    setCollectionModalVisible(false);
    try {
      await addPostToCollection(collection.id, postId);
    } catch {
      setSaved(false);
      Alert.alert('Error', 'Could not save post to collection. Please try again.');
    }
  };

  const handleExternalShare = async () => {
    try {
      await Share.share({
        message: `Check out this post from ${post?.username || 'BetrFood'}: betrfood://posts/${postId}`,
      });
    } catch {
      Alert.alert('Error', 'Could not share the post.');
    }
  };

  const handleCopyLink = async () => {
    const link = `betrfood://posts/${postId}`;
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

  const handleEdit = () => {
    router.push(`/edit-post?postId=${postId}`);
  };

  const handleDelete = () => {
    if (!postId) return;
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(postId);
            Alert.alert('Deleted', 'Post has been deleted.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete post.');
          }
        },
      },
    ]);
  };

  const showOwnerMenu = () => {
    const options = ['Edit Post', 'Delete Post', 'Cancel'];
    showActionSheetWithOptions(
      { options, cancelButtonIndex: 2, destructiveButtonIndex: 1 },
      (index) => {
        if (index === 0) handleEdit();
        if (index === 1) handleDelete();
      }
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Post not found.</Text>
        <TouchableOpacity style={styles.backButtonFallback} onPress={() => router.back()}>
          <Text style={styles.backButtonFallbackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderComment = (comment: Comment, depth: number = 0) => {
    const isCommentOwner = user && user.id === comment.userId;
    const maxIndent = 3;
    const indentLevel = Math.min(depth, maxIndent);

    return (
      <View key={comment.id}>
        <View style={[styles.commentItem, { marginLeft: indentLevel * 24 }]}>
          {/* Comment avatar */}
          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/feeds/user-profile?userId=${comment.userId}`)}
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
            {/* Username and time */}
            <View style={styles.commentHeader}>
              <TouchableOpacity
                onPress={() => router.push(`/(tabs)/feeds/user-profile?userId=${comment.userId}`)}
                accessibilityRole="button"
                accessibilityLabel={`View ${comment.displayName || comment.username || 'user'}'s profile`}
              >
                <Text style={styles.commentUsername}>
                  {comment.displayName || comment.username || 'User'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.commentTime}>{formatCommentTime(comment.createdAt)}</Text>
            </View>

            {/* Content */}
            <Text style={styles.commentContent}>{comment.content}</Text>

            {/* Comment actions */}
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

        {/* Render nested replies */}
        {comment.replies && comment.replies.length > 0 &&
          comment.replies.map((reply) => renderComment(reply, depth + 1))
        }
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">Post</Text>
        {isOwner ? (
          <TouchableOpacity onPress={showOwnerMenu} style={styles.moreButton} accessibilityRole="button" accessibilityLabel="Post options">
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.moreButton} />
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Full-width media */}
        {post.mediaType === 'video' && imageUri ? (
          <DetailVideo uri={imageUri} />
        ) : allImages.length > 1 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setActiveDetailImage(index);
              }}
            >
              {allImages.map((uri, index) => (
                <Image key={index} source={{ uri }} style={styles.postImage} resizeMode="cover" accessibilityLabel={`Photo ${index + 1} by ${post.displayName || post.username || 'user'}`} />
              ))}
            </ScrollView>
            <View style={styles.dotContainer}>
              {allImages.map((_, index) => (
                <View key={index} style={[styles.dot, index === activeDetailImage && styles.dotActive]} />
              ))}
            </View>
          </View>
        ) : imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.postImage} resizeMode="cover" accessibilityLabel={`Photo by ${post.displayName || post.username || 'user'}`} />
        ) : null}

        {/* Author info */}
        <View style={styles.authorRow}>
          {post.avatarUrl ? (
            <Image source={{ uri: post.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarPlaceholderText}>
                {(post.displayName || post.username || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.authorInfo}>
            {post.displayName && (
              <Text style={styles.displayName}>{post.displayName}</Text>
            )}
            {post.username && (
              <Text style={styles.usernameText}>@{post.username}</Text>
            )}
          </View>
        </View>

        {/* Caption */}
        {post.caption ? (
          <Text style={styles.caption}>{post.caption}</Text>
        ) : null}

        {/* Tags */}
        {tags.length > 0 && (
          <View style={styles.tagsSection}>
            <TagDisplay tags={tags} />
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={toggleLike}
            style={styles.actionButton}
            disabled={likeLoading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={liked ? 'Unlike' : 'Like'}
            accessibilityState={{ selected: liked }}
          >
            <Animated.Text
              style={[
                styles.actionText,
                liked && styles.likedText,
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              {liked ? '\u2764\uFE0F' : '\uD83E\uDD0D'} {liked ? 'Liked' : 'Like'}
            </Animated.Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSavePress}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove from saved' : 'Save post'}
            accessibilityState={{ selected: saved }}
          >
            <Text style={[styles.actionText, saved && styles.savedText]}>
              {saved ? '\uD83D\uDD16 Saved' : '\uD83D\uDD16 Save'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={showShareMenu} style={styles.actionButton} accessibilityRole="button" accessibilityLabel="Share">
            <Text style={styles.actionText}>{'\uD83D\uDD17'} Share</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.likeCount}>
          {likeCount} {likeCount === 1 ? 'like' : 'likes'}
        </Text>

        {/* Recipe section */}
        {recipe && (
          <View style={styles.recipeSection}>
            <RecipeDisplay recipe={recipe} />
          </View>
        )}

        {/* Timestamp */}
        <View style={styles.timestampSection}>
          <Text style={styles.timestampText}>
            Posted {formatDate(post.createdAt)}
          </Text>
          {post.editedAt && (
            <Text style={styles.editedText}>
              Edited {formatDate(post.editedAt)}
            </Text>
          )}
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsHeader}>
            {commentTotal} {commentTotal === 1 ? 'Comment' : 'Comments'}
          </Text>

          {comments.length === 0 && !commentsLoading && (
            <Text style={styles.noCommentsText}>
              No comments yet. Be the first to comment!
            </Text>
          )}

          {comments.map((comment) => renderComment(comment, 0))}

          {commentsLoading && (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={styles.commentsLoader}
            />
          )}

          {hasMoreComments && !commentsLoading && (
            <TouchableOpacity
              onPress={handleLoadMoreComments}
              style={styles.loadMoreButton}
              accessibilityRole="button"
              accessibilityLabel="Load more comments"
            >
              <Text style={styles.loadMoreText}>Load more comments</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Comment Input Bar */}
      <View style={styles.commentInputContainer}>
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
            accessibilityLabel="Write a comment"
            accessibilityHint="Type your comment and press send"
          />
          <TouchableOpacity
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || submittingComment}
            style={[
              styles.sendButton,
              (!commentText.trim() || submittingComment) && styles.sendButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send comment"
          >
            {submittingComment ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <SaveCollectionModal
        visible={collectionModalVisible}
        onClose={() => setCollectionModalVisible(false)}
        onSave={handleSaveToCollection}
      />
    </KeyboardAvoidingView>
  );
}

function DetailVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, p => {
    p.loop = false;
  });
  return (
    <VideoView
      player={player}
      style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
      allowsFullscreen
      allowsPictureInPicture
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundPrimary,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  backButtonFallback: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  backButtonFallbackText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.backgroundPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  moreButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  postImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: colors.borderLight,
  },
  dotContainer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 8, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 8, height: 8, borderRadius: 4 },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: colors.borderLight,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  avatarPlaceholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  authorInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  usernameText: {
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: 1,
  },
  caption: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tagsSection: {
    paddingBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: colors.backgroundTertiary,
  },
  actionButton: {
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  likedText: {
    color: colors.liked,
    fontWeight: '600',
  },
  savedText: {
    color: colors.info,
    fontWeight: '600',
  },
  likeCount: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  recipeSection: {
    marginTop: 4,
  },
  timestampSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.backgroundTertiary,
    marginTop: 8,
  },
  timestampText: {
    fontSize: 12,
    color: colors.textQuaternary,
  },
  editedText: {
    fontSize: 12,
    color: colors.textQuaternary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  // Comments section
  commentsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.backgroundTertiary,
    marginTop: 8,
  },
  commentsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  noCommentsText: {
    fontSize: 14,
    color: colors.textQuaternary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 14,
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
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 44,
    justifyContent: 'center',
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
  // Comment input bar
  commentInputContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.backgroundPrimary,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.backgroundSubtle,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  commentInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 9,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 56,
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
  sendButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
