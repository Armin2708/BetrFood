import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { router, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthenticationContext';
import { createPostApi } from '../../services/api';

// TODO: replace with real user ID from AuthContext once backend auth is wired up
const CURRENT_USER_ID = 'current-user';
const MAX_IMAGES = 10;

const { width } = Dimensions.get('window');
const THUMB_SIZE = (width - 48 - 12) / 4; // 4 thumbnails per row with padding

export default function CreatePostScreen() {
  const { user } = useContext(AuthContext);

  const [images, setImages] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Image picker ──────────────────────────────────────────────────────────

  const pickImages = async () => {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      Alert.alert('Limit reached', `You can add up to ${MAX_IMAGES} images per post.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
      orderedSelection: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, MAX_IMAGES));
    }
  };

  // ── Remove image ──────────────────────────────────────────────────────────

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Move image left/right (reorder) ──────────────────────────────────────

  const moveImage = (index: number, direction: 'left' | 'right') => {
    const newImages = [...images];
    const swapIndex = direction === 'left' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newImages.length) return;
    [newImages[index], newImages[swapIndex]] = [newImages[swapIndex], newImages[index]];
    setImages(newImages);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (images.length === 0) {
      Alert.alert('No images', 'Please select at least one image.');
      return;
    }
    if (!caption.trim()) {
      Alert.alert('No caption', 'Please add a caption.');
      return;
    }

    setLoading(true);
    try {
      await createPostApi(images, caption.trim(), CURRENT_USER_ID);
      router.replace('/(tabs)/feeds');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create post.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{ title: 'New Post', headerBackTitle: 'Cancel' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Image preview area */}
        {images.length > 0 ? (
          <View style={styles.previewContainer}>
            {/* Large preview of first image */}
            <Image source={{ uri: images[0] }} style={styles.mainPreview} resizeMode="cover" />
            {images.length > 1 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{images.length} photos</Text>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.emptyPicker} onPress={pickImages}>
            <Ionicons name="images-outline" size={48} color="#ccc" />
            <Text style={styles.emptyPickerText}>Tap to select photos</Text>
            <Text style={styles.emptyPickerSub}>Up to {MAX_IMAGES} images</Text>
          </TouchableOpacity>
        )}

        {/* Thumbnail strip with reorder controls */}
        {images.length > 0 && (
          <View style={styles.thumbSection}>
            <View style={styles.thumbRow}>
              {images.map((uri, i) => (
                <View key={i} style={styles.thumbWrapper}>
                  <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />

                  {/* First image gets a "cover" label */}
                  {i === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>Cover</Text>
                    </View>
                  )}

                  {/* Remove button */}
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(i)}>
                    <Ionicons name="close-circle" size={18} color="#fff" />
                  </TouchableOpacity>

                  {/* Reorder arrows */}
                  <View style={styles.reorderRow}>
                    {i > 0 && (
                      <TouchableOpacity onPress={() => moveImage(i, 'left')} style={styles.arrowBtn}>
                        <Ionicons name="chevron-back" size={12} color="#fff" />
                      </TouchableOpacity>
                    )}
                    {i < images.length - 1 && (
                      <TouchableOpacity onPress={() => moveImage(i, 'right')} style={styles.arrowBtn}>
                        <Ionicons name="chevron-forward" size={12} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}

              {/* Add more button */}
              {images.length < MAX_IMAGES && (
                <TouchableOpacity style={styles.addMoreBtn} onPress={pickImages}>
                  <Ionicons name="add" size={28} color="#FF6B35" />
                  <Text style={styles.addMoreText}>{images.length}/{MAX_IMAGES}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Caption input */}
        <View style={styles.captionSection}>
          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption..."
            placeholderTextColor="#aaa"
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={2200}
          />
          <Text style={styles.charCount}>{caption.length}/2200</Text>
        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.submitButton, (loading || images.length === 0) && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={loading || images.length === 0}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Share Post</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
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
  emptyPicker: {
    height: 260,
    margin: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#eee',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fafafa',
  },
  emptyPickerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#aaa',
  },
  emptyPickerSub: {
    fontSize: 13,
    color: '#ccc',
  },
  previewContainer: {
    position: 'relative',
  },
  mainPreview: {
    width: '100%',
    height: 300,
    backgroundColor: '#eee',
  },
  countBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  thumbSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  thumbRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thumbWrapper: {
    position: 'relative',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 6,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,107,53,0.85)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  coverBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  removeBtn: {
    position: 'absolute',
    top: 3,
    right: 3,
  },
  reorderRow: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  arrowBtn: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    padding: 2,
  },
  addMoreBtn: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  addMoreText: {
    fontSize: 10,
    color: '#FF6B35',
    fontWeight: '600',
  },
  captionSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  captionInput: {
    fontSize: 15,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  charCount: {
    fontSize: 11,
    color: '#ccc',
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    margin: 16,
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
