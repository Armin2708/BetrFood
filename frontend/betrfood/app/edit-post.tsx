import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { fetchPost, updatePost, getImageUrl } from '../services/api';

export default function EditPostScreen() {
  const { postId, userId } = useLocalSearchParams<{ postId: string; userId: string }>();

  const [caption, setCaption] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!postId) return;
    loadPost();
  }, [postId]);

  async function loadPost() {
    try {
      setLoading(true);
      const post = await fetchPost(postId!);
      setCaption(post.caption || '');
      setImagePath(post.imagePath || '');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load post.');
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!postId || !userId) return;

    setSaving(true);
    try {
      await updatePost(postId, userId, { caption });
      Alert.alert('Success', 'Post updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update post.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    router.back();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  const imageUri = imagePath.startsWith('http')
    ? imagePath
    : getImageUrl(imagePath);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Edit Post</Text>

        {imagePath ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : null}

        <Text style={styles.label}>Caption</Text>
        <TextInput
          style={styles.captionInput}
          value={caption}
          onChangeText={setCaption}
          placeholder="Write a caption..."
          multiline
          maxLength={500}
        />
        <Text style={styles.charCount}>{caption.length}/500</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#333' },
  image: { width: '100%', height: 250, borderRadius: 12, backgroundColor: '#eee', marginBottom: 16 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  captionInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, minHeight: 100, textAlignVertical: 'top', color: '#333' },
  charCount: { alignSelf: 'flex-end', color: '#999', fontSize: 12, marginTop: 4, marginBottom: 16 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  cancelButtonText: { fontSize: 16, color: '#666', fontWeight: '600' },
  saveButton: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#2ecc71', alignItems: 'center' },
  saveButtonText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
});
