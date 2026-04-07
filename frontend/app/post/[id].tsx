import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { colors } from '../../constants/theme';
import { fetchPost, getImageUrl, getAvatarUrl } from '../../services/api';
import { AuthContext } from '../../context/AuthenticationContext';
import Post from '../../components/Post';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useContext(AuthContext);

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchPost(id)
      .then(setPost)
      .catch((err) => setError(err.message || 'Failed to load post'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Post
        </Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error || !post ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.errorText}>{error || 'Post not found'}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Post
            id={post.id}
            profilePic={getAvatarUrl(post.avatarUrl, post.displayName || post.username || post.userId)}
            username={post.displayName || post.username || post.userId}
            postImage={getImageUrl(post.imagePath)}
            postImages={post.images ? post.images.map(getImageUrl) : undefined}
            caption={post.caption}
            userId={post.userId}
            currentUserId={user?.id}
            onDeleted={() => router.back()}
            tags={post.tags}
            editedAt={post.editedAt}
            createdAt={post.createdAt}
            initialLiked={post.liked}
            initialLikes={post.likeCount}
            mediaType={post.mediaType}
            commentCount={post.commentCount}
            verified={post.verified}
            hasRecipe={!!post.recipeId}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: { padding: 4, marginRight: 4 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  headerRight: { width: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  errorText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  backLink: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 20,
  },
  backLinkText: { color: colors.white, fontWeight: '600', fontSize: 15 },
  scrollContent: { paddingBottom: 32 },
});
