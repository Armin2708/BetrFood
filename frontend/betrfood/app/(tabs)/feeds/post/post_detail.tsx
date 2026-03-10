import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { AuthContext } from '../../../../context/AuthenticationContext';
import TagDisplay from '../../../../components/TagDisplay';
import RecipeDisplay from '../../../../components/RecipeDisplay';
import ImageCarousel from '../../../../components/ImageCarousel';
import { fetchPost, getImageUrl, Post } from '../../../../services/api';
import SaveCollectionModal from '../../../../components/SaveCollectionModal';
import { Collection } from '../../../../context/CollectionsContext';
import { Image } from 'react-native';

// TODO: replace with real user ID from AuthContext once backend auth is wired up
const CURRENT_USER_ID = 'current-user';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useContext(AuthContext);
  const { showActionSheetWithOptions } = useActionSheet();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [collectionModalVisible, setCollectionModalVisible] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchPost(id)
      .then(setPost)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = (collection: Collection) => {
    setSaved(true);
    setCollectionModalVisible(false);
  };

  const handleExternalShare = async () => {
    try {
      await Share.share({ message: `Check out this post: https://yourapp.com/posts/${id}` });
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

  const handleAuthorPress = () => {
    if (!post) return;
    if (post.userId === CURRENT_USER_ID) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/user/${post.userId}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Post not found.'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Resolve image list
  const images = post.imagePaths && post.imagePaths.length > 0
    ? post.imagePaths.map(getImageUrl)
    : [getImageUrl(post.imagePath)];

  return (
    <>
      <Stack.Screen options={{ title: '', headerBackTitle: 'Feed' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Tappable author header */}
        <TouchableOpacity style={styles.header} onPress={handleAuthorPress}>
          <Image
            source={{ uri: `https://ui-avatars.com/api/?name=${post.userId}&background=random` }}
            style={styles.profilePic}
          />
          <View>
            <Text style={styles.username}>{post.userId}</Text>
            <Text style={styles.timestamp}>
              {new Date(post.createdAt).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Carousel — full width, square aspect */}
        <ImageCarousel images={images} height={380} />

        {/* Action bar */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => setLiked(!liked)} style={styles.actionButton}>
            <Text style={[styles.actionIcon, liked && styles.liked]}>{liked ? '❤️' : '🤍'}</Text>
            <Text style={[styles.actionLabel, liked && styles.liked]}>Like</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => saved ? setSaved(false) : setCollectionModalVisible(true)}
            style={styles.actionButton}
          >
            <Text style={styles.actionIcon}>{saved ? '🔖' : '📄'}</Text>
            <Text style={[styles.actionLabel, saved && styles.savedLabel]}>
              {saved ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={showShareMenu} style={styles.actionButton}>
            <Text style={styles.actionIcon}>🔗</Text>
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Caption */}
        <View style={styles.captionContainer}>
          <Text style={styles.captionUsername}>{post.userId} </Text>
          <Text style={styles.caption}>{post.caption}</Text>
        </View>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && <TagDisplay tags={post.tags} />}

        {/* Recipe */}
        {post.recipe && <RecipeDisplay recipe={post.recipe} />}

      </ScrollView>

      <SaveCollectionModal
        visible={collectionModalVisible}
        onClose={() => setCollectionModalVisible(false)}
        onSave={handleSave}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  profilePic: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  username: {
    fontWeight: '700',
    fontSize: 15,
    color: '#222',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 24,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionLabel: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  liked: {
    color: '#e0245e',
  },
  savedLabel: {
    color: '#FF6B35',
  },
  captionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  captionUsername: {
    fontWeight: '700',
    fontSize: 14,
    color: '#222',
  },
  caption: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    flex: 1,
  },
});
