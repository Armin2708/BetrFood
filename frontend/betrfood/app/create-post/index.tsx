import React, { useState, useContext, useEffect } from 'react';
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
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { AuthContext } from '../../context/AuthenticationContext';
import { createPostApi, saveDraft, fetchPost, publishDraft, getImageUrl } from '../../services/api';

// TODO: replace with real user ID from AuthContext once backend auth is wired up
const CURRENT_USER_ID = 'current-user';
const MAX_IMAGES = 10;
const MAX_VIDEO_SECONDS = 60;

const { width } = Dimensions.get('window');
const THUMB_SIZE = (width - 48 - 12) / 4;

type MediaMode = 'images' | 'video';

export default function CreatePostScreen() {
  const { user } = useContext(AuthContext);
  const { draftId } = useLocalSearchParams<{ draftId?: string }>();
  const isEditingDraft = !!draftId;

  const [mediaMode, setMediaMode] = useState<MediaMode>('images');
  const [images, setImages] = useState<string[]>([]);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(isEditingDraft);

  // ── Load existing draft ───────────────────────────────────────────────────

  useEffect(() => {
    if (!draftId) return;
    fetchPost(draftId)
      .then((draft) => {
        setCaption(draft.caption || '');
        if (draft.videoPath) {
          setMediaMode('video');
          setVideoUri(getImageUrl(draft.videoPath));
        } else if (draft.imagePaths && draft.imagePaths.length > 0) {
          setMediaMode('images');
          setImages(draft.imagePaths.map((p) => getImageUrl(p)));
        }
      })
      .catch((e) => {
        console.error('Failed to load draft:', e);
        Alert.alert('Error', 'Failed to load draft.');
      })
      .finally(() => setLoadingDraft(false));
  }, [draftId]);

  // ── Pick images ───────────────────────────────────────────────────────────

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
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, MAX_IMAGES));
    }
  };

  // ── Pick video ────────────────────────────────────────────────────────────

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      videoMaxDuration: MAX_VIDEO_SECONDS,
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const durationSec = asset.duration ? asset.duration / 1000 : null;
      if (durationSec && durationSec > MAX_VIDEO_SECONDS) {
        Alert.alert('Video too long', `Videos must be ${MAX_VIDEO_SECONDS} seconds or less.`);
        return;
      }
      setVideoUri(asset.uri);
      setVideoDuration(durationSec);
    }
  };

  // ── Record video ──────────────────────────────────────────────────────────

  const recordVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your camera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: MAX_VIDEO_SECONDS,
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setVideoUri(asset.uri);
      setVideoDuration(asset.duration ? asset.duration / 1000 : null);
    }
  };

  // ── Reorder images ────────────────────────────────────────────────────────

  const removeImage = (index: number) => setImages((prev) => prev.filter((_, i) => i !== index));

  const moveImage = (index: number, direction: 'left' | 'right') => {
    const next = [...images];
    const swapIndex = direction === 'left' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= next.length) return;
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    setImages(next);
  };

  // ── Save as draft ─────────────────────────────────────────────────────────

  const handleSaveDraft = async () => {
    if (!caption.trim() && images.length === 0 && !videoUri) {
      Alert.alert('Nothing to save', 'Add a caption or some media before saving a draft.');
      return;
    }
    setSavingDraft(true);
    try {
      if (mediaMode === 'images') {
        await saveDraft(images, caption.trim(), CURRENT_USER_ID);
      } else {
        await saveDraft([], caption.trim(), CURRENT_USER_ID, videoUri ?? undefined);
      }
      Alert.alert('Draft saved', 'Your draft has been saved. You can find it in your profile.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/feeds') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  // ── Publish draft ─────────────────────────────────────────────────────────

  const handlePublishDraft = async () => {
    if (!draftId) return;
    const hasMedia = mediaMode === 'images' ? images.length > 0 : !!videoUri;
    if (!hasMedia) {
      Alert.alert('No media', 'Add at least one image or video before publishing.');
      return;
    }
    if (!caption.trim()) {
      Alert.alert('No caption', 'Please add a caption before publishing.');
      return;
    }
    setLoading(true);
    try {
      await publishDraft(draftId, CURRENT_USER_ID);
      router.replace('/(tabs)/feeds');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to publish draft.');
    } finally {
      setLoading(false);
    }
  };

  // ── Submit new post ───────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const hasMedia = mediaMode === 'images' ? images.length > 0 : !!videoUri;
    if (!hasMedia) {
      Alert.alert('No media', `Please select ${mediaMode === 'images' ? 'at least one image' : 'a video'}.`);
      return;
    }
    if (!caption.trim()) {
      Alert.alert('No caption', 'Please add a caption.');
      return;
    }
    setLoading(true);
    try {
      if (mediaMode === 'images') {
        await createPostApi(images, caption.trim(), CURRENT_USER_ID);
      } else {
        await createPostApi([], caption.trim(), CURRENT_USER_ID, null, videoUri!);
      }
      router.replace('/(tabs)/feeds');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create post.');
    } finally {
      setLoading(false);
    }
  };

  const hasMedia = mediaMode === 'images' ? images.length > 0 : !!videoUri;
  const hasAnything = hasMedia || caption.trim().length > 0;

  // ── Loading draft ─────────────────────────────────────────────────────────

  if (loadingDraft) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Draft', headerBackTitle: 'Cancel' }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading draft...</Text>
        </View>
      </>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{
        title: isEditingDraft ? 'Edit Draft' : 'New Post',
        headerBackTitle: 'Cancel',
      }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Draft banner */}
        {isEditingDraft && (
          <View style={styles.draftBanner}>
            <Ionicons name="document-text-outline" size={16} color="#FF6B35" />
            <Text style={styles.draftBannerText}>You're editing a draft — publish when ready</Text>
          </View>
        )}

        {/* Media type toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mediaMode === 'images' && styles.modeBtnActive]}
            onPress={() => setMediaMode('images')}
          >
            <Ionicons name="images-outline" size={18} color={mediaMode === 'images' ? '#FF6B35' : '#999'} />
            <Text style={[styles.modeBtnText, mediaMode === 'images' && styles.modeBtnTextActive]}>Photos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mediaMode === 'video' && styles.modeBtnActive]}
            onPress={() => setMediaMode('video')}
          >
            <Ionicons name="videocam-outline" size={18} color={mediaMode === 'video' ? '#FF6B35' : '#999'} />
            <Text style={[styles.modeBtnText, mediaMode === 'video' && styles.modeBtnTextActive]}>Video</Text>
          </TouchableOpacity>
        </View>

        {/* ── IMAGE MODE ── */}
        {mediaMode === 'images' && (
          <>
            {images.length > 0 ? (
              <View style={styles.previewContainer}>
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

            {images.length > 0 && (
              <View style={styles.thumbSection}>
                <View style={styles.thumbRow}>
                  {images.map((uri, i) => (
                    <View key={i} style={styles.thumbWrapper}>
                      <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
                      {i === 0 && (
                        <View style={styles.coverBadge}>
                          <Text style={styles.coverBadgeText}>Cover</Text>
                        </View>
                      )}
                      <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(i)}>
                        <Ionicons name="close-circle" size={18} color="#fff" />
                      </TouchableOpacity>
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
                  {images.length < MAX_IMAGES && (
                    <TouchableOpacity style={styles.addMoreBtn} onPress={pickImages}>
                      <Ionicons name="add" size={28} color="#FF6B35" />
                      <Text style={styles.addMoreText}>{images.length}/{MAX_IMAGES}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </>
        )}

        {/* ── VIDEO MODE ── */}
        {mediaMode === 'video' && (
          <>
            {videoUri ? (
              <View style={styles.previewContainer}>
                <Video
                  source={{ uri: videoUri }}
                  style={styles.mainPreview}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={false}
                  isMuted
                  useNativeControls
                />
                {videoDuration && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{Math.ceil(videoDuration)}s</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.removeVideoBtn} onPress={() => setVideoUri(null)}>
                  <Ionicons name="close-circle" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.videoPickerRow}>
                <TouchableOpacity style={styles.videoPickerBtn} onPress={pickVideo}>
                  <Ionicons name="cloud-upload-outline" size={36} color="#FF6B35" />
                  <Text style={styles.videoPickerLabel}>Choose from library</Text>
                  <Text style={styles.videoPickerSub}>Max {MAX_VIDEO_SECONDS}s</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.videoPickerBtn} onPress={recordVideo}>
                  <Ionicons name="camera-outline" size={36} color="#FF6B35" />
                  <Text style={styles.videoPickerLabel}>Record a video</Text>
                  <Text style={styles.videoPickerSub}>Max {MAX_VIDEO_SECONDS}s</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Caption */}
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

        {/* Action buttons */}
        <View style={styles.actionRow}>
          {/* Save as Draft — hidden when editing an existing draft */}
          {!isEditingDraft && (
            <TouchableOpacity
              style={[styles.draftButton, (!hasAnything || savingDraft) && styles.draftButtonDisabled]}
              onPress={handleSaveDraft}
              disabled={!hasAnything || savingDraft}
            >
              {savingDraft ? (
                <ActivityIndicator color="#FF6B35" size="small" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#FF6B35" />
                  <Text style={styles.draftText}>Save Draft</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Publish Draft / Share Post */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!hasMedia || loading) && styles.submitDisabled,
              isEditingDraft && styles.submitButtonFull,
            ]}
            onPress={isEditingDraft ? handlePublishDraft : handleSubmit}
            disabled={!hasMedia || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {isEditingDraft ? 'Publish Draft' : 'Share Post'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#999', fontSize: 14 },
  draftBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff5f0', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderColor: '#ffe0d0',
  },
  draftBannerText: { fontSize: 13, color: '#FF6B35', fontWeight: '500' },
  modeToggle: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee' },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  modeBtnActive: { borderBottomColor: '#FF6B35' },
  modeBtnText: { fontSize: 14, fontWeight: '600', color: '#999' },
  modeBtnTextActive: { color: '#FF6B35' },
  emptyPicker: {
    height: 260, margin: 16, borderRadius: 12, borderWidth: 2, borderColor: '#eee',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
    gap: 8, backgroundColor: '#fafafa',
  },
  emptyPickerText: { fontSize: 16, fontWeight: '600', color: '#aaa' },
  emptyPickerSub: { fontSize: 13, color: '#ccc' },
  previewContainer: { position: 'relative' },
  mainPreview: { width: '100%', height: 300, backgroundColor: '#000' },
  countBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  countBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  removeVideoBtn: { position: 'absolute', top: 8, right: 8 },
  videoPickerRow: { flexDirection: 'row', gap: 12, margin: 16 },
  videoPickerBtn: {
    flex: 1, height: 160, borderRadius: 12, borderWidth: 2, borderColor: '#FF6B35',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
    gap: 8, backgroundColor: '#fff5f0',
  },
  videoPickerLabel: { fontSize: 13, fontWeight: '600', color: '#FF6B35', textAlign: 'center' },
  videoPickerSub: { fontSize: 11, color: '#ccc' },
  thumbSection: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  thumbRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbWrapper: { position: 'relative', width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 6, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,107,53,0.85)', paddingVertical: 2, alignItems: 'center',
  },
  coverBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  removeBtn: { position: 'absolute', top: 3, right: 3 },
  reorderRow: {
    position: 'absolute', bottom: 18, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4,
  },
  arrowBtn: { backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 8, padding: 2 },
  addMoreBtn: {
    width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 6, borderWidth: 2,
    borderColor: '#FF6B35', borderStyle: 'dashed', justifyContent: 'center',
    alignItems: 'center', gap: 2,
  },
  addMoreText: { fontSize: 10, color: '#FF6B35', fontWeight: '600' },
  captionSection: { padding: 16, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  captionInput: { fontSize: 15, color: '#333', minHeight: 80, textAlignVertical: 'top', lineHeight: 22 },
  charCount: { fontSize: 11, color: '#ccc', textAlign: 'right', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10, margin: 16 },
  draftButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 10, borderWidth: 1.5,
    borderColor: '#FF6B35', backgroundColor: '#fff',
  },
  draftButtonDisabled: { opacity: 0.4 },
  draftText: { color: '#FF6B35', fontWeight: '700', fontSize: 15 },
  submitButton: {
    flex: 2, backgroundColor: '#FF6B35', paddingVertical: 14,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  submitButtonFull: { flex: 1 },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
