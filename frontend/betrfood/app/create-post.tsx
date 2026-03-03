import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { createPostApi } from '../services/api';

const MAX_CAPTION_LENGTH = 500;

export default function CreatePostScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setImage(result.assets[0].uri);
  };

  const submitPost = async () => {
    if (!image) {
      Alert.alert('Image required', 'Please select or take a photo first.');
      return;
    }
    setLoading(true);
    try {
      await createPostApi(image, caption, 'current-user');
      Alert.alert('Success', 'Your post has been published!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Post</Text>
          <TouchableOpacity onPress={submitPost} disabled={loading || !image}>
            <Text style={[styles.postText, (!image || loading) && styles.disabledText]}>Post</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.imageSection}>
          {image ? (
            <TouchableOpacity onPress={pickImage}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <Text style={styles.changeText}>Tap to change</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.imagePlaceholder}>
              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <Text style={styles.imageButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                <Text style={styles.imageButtonText}>Take a Photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.captionSection}>
          <TextInput
            style={styles.captionInput} placeholder="Write a caption..."
            placeholderTextColor="#999" multiline maxLength={MAX_CAPTION_LENGTH}
            value={caption} onChangeText={setCaption}
          />
          <Text style={styles.charCount}>{caption.length}/{MAX_CAPTION_LENGTH}</Text>
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>Publishing...</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderColor: '#eee',
  },
  cancelText: { fontSize: 16, color: '#666' },
  title: { fontSize: 18, fontWeight: 'bold' },
  postText: { fontSize: 16, fontWeight: 'bold', color: '#FF6B35' },
  disabledText: { color: '#ccc' },
  imageSection: { alignItems: 'center', paddingVertical: 20 },
  previewImage: { width: 300, height: 300, borderRadius: 12, backgroundColor: '#eee' },
  changeText: { textAlign: 'center', color: '#999', marginTop: 8, fontSize: 14 },
  imagePlaceholder: {
    width: 300, height: 300, borderRadius: 12, borderWidth: 2,
    borderColor: '#ddd', borderStyle: 'dashed', justifyContent: 'center',
    alignItems: 'center', gap: 16,
  },
  imageButton: { backgroundColor: '#FF6B35', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  imageButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  captionSection: { paddingHorizontal: 16, paddingVertical: 12 },
  captionInput: {
    fontSize: 16, minHeight: 100, textAlignVertical: 'top',
    borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12,
  },
  charCount: { textAlign: 'right', color: '#999', marginTop: 4, fontSize: 12 },
  loadingOverlay: { alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 8, color: '#666' },
});
