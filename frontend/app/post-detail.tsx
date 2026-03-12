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
  fetchComments,
  createComment,
  deleteComment,
  Post,
  Recipe,
  Tag,
  Comment,
} from '../services/api';
import { AuthContext } from '../context/AuthenticationContext';
import TagDisplay from '../components/TagDisplay';
import RecipeDisplay from '../components/RecipeDisplay';

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
      const [postData, tagsData] = await Promise.all([
        fetchPost(postId!),
        fetchPostTags(postId!),
      ]);
      setPost(postData);
      setTags(tagsData);

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

  const handleExternalShare = async () => {
    try {
      await Share.share({
        message: `Check out this post from ${post?.username || 'BetrFood'}: https://yourapp.com/posts/${postId}`,
      });
    } catch {
      Alert.alert('Error', 'Could not share the post.');
    }
  };

  const handleCopyLink = async () => {
    const link = `https://yourapp.com/posts/${postId}`;
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
        <ActivityIndicator size="large" color="#FF6B35" />
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
          {comment.avatarUrl ? (
            <Image source={{ uri: comment.avatarUrl }} style={styles.commentAvatar} />
          ) : (
            <View style={[styles.commentAvatar, styles.commentAvatarPlaceholder]}>
              <Text style={styles.commentAvatarText}>
                {(comment.displayName || comment.username || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.commentBody}>
            {/* Username and time */}
            <View style={styles.commentHeader}>
              <Text style={styles.commentUsername}>
                {comment.displayName || comment.username || 'User'}
              </Text>
              <Text style={styles.commentTime}>{formatCommentTime(comment.createdAt)}</Text>
            </View>

            {/* Content */}
            <Text style={styles.commentContent}>{comment.content}</Text>

            {/* Comment actions */}
            <View style={styles.commentActions}>
              <TouchableOpacity onPress={() => handleReply(comment)} style={styles.commentActionBtn}>
                <Text style={styles.commentActionText}>Reply</Text>
              </TouchableOpacity>
              {isCommentOwner && (
                <TouchableOpacity
                  onPress={() => handleDeleteComment(comment.id)}
                  style={styles.commentActionBtn}
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        {isOwner ? (
          <TouchableOpacity onPress={showOwnerMenu} style={styles.moreButton}>
            <Text style={styles.moreButtonText}>...</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.moreButton} />
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Full-width image */}
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.postImage} resizeMode="cover" />
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

          <TouchableOpacity onPress={showShareMenu} style={styles.actionButton}>
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
              color="#FF6B35"
              style={styles.commentsLoader}
            />
          )}

          {hasMoreComments && !commentsLoading && (
            <TouchableOpacity
              onPress={handleLoadMoreComments}
              style={styles.loadMoreButton}
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
            placeholderTextColor="#999"
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || submittingComment}
            style={[
              styles.sendButton,
              (!commentText.trim() || submittingComment) && styles.sendButtonDisabled,
            ]}
          >
            {submittingComment ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  backButtonFallback: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
  },
  backButtonFallbackText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  moreButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
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
    backgroundColor: '#eee',
  },
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
    backgroundColor: '#eee',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
  },
  avatarPlaceholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  authorInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  usernameText: {
    fontSize: 14,
    color: '#888',
    marginTop: 1,
  },
  caption: {
    fontSize: 15,
    color: '#333',
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
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 16,
    color: '#333',
  },
  likedText: {
    color: 'red',
    fontWeight: '600',
  },
  likeCount: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  recipeSection: {
    marginTop: 4,
  },
  timestampSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },
  timestampText: {
    fontSize: 12,
    color: '#999',
  },
  editedText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
  },
  // Comments section
  commentsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },
  commentsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  noCommentsText: {
    fontSize: 14,
    color: '#999',
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
    backgroundColor: '#eee',
  },
  commentAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
  },
  commentAvatarText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
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
    color: '#333',
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
  },
  commentContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 16,
  },
  commentActionBtn: {
    paddingVertical: 2,
  },
  commentActionText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  commentDeleteText: {
    color: '#e74c3c',
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
    color: '#FF6B35',
    fontWeight: '600',
  },
  // Comment input bar
  commentInputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  replyIndicatorText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  replyCancel: {
    fontSize: 13,
    color: '#FF6B35',
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
    backgroundColor: '#f5f5f5',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 9,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 56,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
