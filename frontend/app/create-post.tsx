import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  Animated, FlatList, Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPostApi, RecipeInput, addTagsToPost } from '../services/api';
import TagSelector from '../components/TagSelector';

const MAX_CAPTION_LENGTH = 500;
const DIFFICULTY_OPTIONS: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
const DRAFTS_STORAGE_KEY = 'drafts';

interface IngredientField {
  name: string;
  quantity: string;
  unit: string;
}

interface StepField {
  instruction: string;
}

export interface Draft {
  id: string;
  imageUri: string | null; // legacy single image
  imageUris?: string[]; // multi-image
  caption: string;
  selectedTagIds: number[];
  showRecipe: boolean;
  cookTime: string;
  servings: string;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: IngredientField[];
  steps: StepField[];
  timestamp: number;
}

export default function CreatePostScreen() {
  const { draftId } = useLocalSearchParams<{ draftId?: string }>();
  const [images, setImages] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);

  // Tag state
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // Recipe state
  const [showRecipe, setShowRecipe] = useState(false);
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [ingredients, setIngredients] = useState<IngredientField[]>([
    { name: '', quantity: '', unit: '' },
  ]);
  const [steps, setSteps] = useState<StepField[]>([{ instruction: '' }]);

  // Upload status: null = not uploading, 'uploading' | 'success' | 'error'
  const [uploadStatus, setUploadStatus] = useState<'uploading' | 'success' | 'error' | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastMessage(null));
  };

  // Load draft if draftId is provided
  useEffect(() => {
    if (draftId) {
      loadDraft(draftId);
    }
  }, [draftId]);

  const loadDraft = async (id: string) => {
    try {
      const raw = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);
      if (!raw) return;
      const drafts: Draft[] = JSON.parse(raw);
      const draft = drafts.find((d) => d.id === id);
      if (!draft) return;
      if (draft.imageUris && draft.imageUris.length > 0) {
        setImages(draft.imageUris);
      } else if (draft.imageUri) {
        setImages([draft.imageUri]);
      }
      setCaption(draft.caption);
      setSelectedTagIds(draft.selectedTagIds);
      setShowRecipe(draft.showRecipe);
      setCookTime(draft.cookTime);
      setServings(draft.servings);
      setDifficulty(draft.difficulty);
      setIngredients(draft.ingredients.length > 0 ? draft.ingredients : [{ name: '', quantity: '', unit: '' }]);
      setSteps(draft.steps.length > 0 ? draft.steps : [{ instruction: '' }]);
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  };

  const saveDraft = async () => {
    if (!caption.trim() && !showRecipe && selectedTagIds.length === 0 && images.length === 0) {
      Alert.alert('Empty draft', 'Please add some content before saving a draft.');
      return;
    }
    try {
      const raw = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);
      const drafts: Draft[] = raw ? JSON.parse(raw) : [];

      const newDraft: Draft = {
        id: draftId || `draft_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        imageUri: images[0] || null,
        imageUris: images,
        caption,
        selectedTagIds,
        showRecipe,
        cookTime,
        servings,
        difficulty,
        ingredients,
        steps,
        timestamp: Date.now(),
      };

      // If editing an existing draft, replace it
      const existingIndex = drafts.findIndex((d) => d.id === newDraft.id);
      if (existingIndex >= 0) {
        drafts[existingIndex] = newDraft;
      } else {
        drafts.unshift(newDraft);
      }

      await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
      showToast('Draft saved!');
    } catch (error) {
      showToast('Failed to save draft.');
    }
  };

  const MAX_IMAGES = 10;

  const isVideoUri = (uri: string) => /\.(mp4|mov|webm|avi|m4v)$/i.test(uri);

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.7,
      videoMaxDuration: 20,
    });
    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map(a => a.uri);
      setImages(prev => [...prev, ...newUris].slice(0, MAX_IMAGES));
    }
  };

  const takePhoto = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Limit reached', `You can add up to ${MAX_IMAGES} media items.`);
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true, quality: 0.7,
      videoMaxDuration: 20,
    });
    if (!result.canceled && result.assets[0]) {
      setImages(prev => [...prev, result.assets[0].uri].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Ingredient helpers
  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '', unit: '' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length <= 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof IngredientField, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  // Step helpers
  const addStep = () => {
    setSteps([...steps, { instruction: '' }]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, value: string) => {
    const updated = [...steps];
    updated[index] = { instruction: value };
    setSteps(updated);
  };

  const buildRecipeData = (): RecipeInput | null => {
    if (!showRecipe) return null;

    const validIngredients = ingredients.filter(ing => ing.name.trim() !== '');
    const validSteps = steps.filter(step => step.instruction.trim() !== '');

    if (validIngredients.length === 0 && validSteps.length === 0 && !cookTime && !servings) {
      return null;
    }

    return {
      cookTime: cookTime ? parseInt(cookTime, 10) : null,
      servings: servings ? parseInt(servings, 10) : null,
      difficulty,
      ingredients: validIngredients.map(ing => ({
        name: ing.name.trim(),
        quantity: ing.quantity.trim() || undefined,
        unit: ing.unit.trim() || undefined,
      })),
      steps: validSteps.map(step => ({
        instruction: step.instruction.trim(),
      })),
    };
  };

  const submitPost = async () => {
    if (images.length === 0) {
      Alert.alert('Media required', 'Please select a photo or video first.');
      return;
    }
    setUploadStatus('uploading');
    setUploadError(null);
    try {
      const recipeData = buildRecipeData();
      const post = await createPostApi(images, caption, recipeData);

      // Add tags if any selected
      if (selectedTagIds.length > 0) {
        await addTagsToPost(post.id, selectedTagIds);
      }

      // If this was a draft, remove it after successful post
      if (draftId) {
        try {
          const raw = await AsyncStorage.getItem(DRAFTS_STORAGE_KEY);
          if (raw) {
            const drafts: Draft[] = JSON.parse(raw);
            const filtered = drafts.filter((d) => d.id !== draftId);
            await AsyncStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(filtered));
          }
        } catch {}
      }

      setUploadStatus('success');
      // Auto-redirect to feed after a short delay
      setTimeout(() => {
        router.replace('/feeds');
      }, 1500);
    } catch (error: any) {
      setUploadStatus('error');
      setUploadError(error.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/feeds')}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Post</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={saveDraft} style={styles.draftButton}>
              <Text style={styles.draftButtonText}>Save Draft</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={submitPost} disabled={!!uploadStatus || images.length === 0}>
              <Text style={[styles.postText, (images.length === 0 || !!uploadStatus) && styles.disabledText]}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Drafts link */}
        <TouchableOpacity
          style={styles.draftsLink}
          onPress={() => router.push('/drafts')}
        >
          <Text style={styles.draftsLinkText}>View Drafts</Text>
        </TouchableOpacity>

        <View style={styles.imageSection}>
          {images.length > 0 ? (
            <View>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.imageCarousel}
              >
                {images.map((uri, index) => (
                  <View key={index} style={styles.carouselSlide}>
                    <Image source={{ uri }} style={styles.previewImage} />
                    {isVideoUri(uri) && (
                      <View style={styles.videoOverlay}>
                        <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close-circle" size={28} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              {images.length > 1 && (
                <Text style={styles.imageCounter}>{images.length} / {MAX_IMAGES} items</Text>
              )}
              {images.length < MAX_IMAGES && (
                <View style={styles.addMoreRow}>
                  <TouchableOpacity style={styles.addMoreButton} onPress={pickMedia}>
                    <Ionicons name="images-outline" size={18} color="#FF6B35" />
                    <Text style={styles.addMoreText}>Add More</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addMoreButton} onPress={takePhoto}>
                    <Ionicons name="camera-outline" size={18} color="#FF6B35" />
                    <Text style={styles.addMoreText}>Take Photo</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <TouchableOpacity style={styles.imageButton} onPress={pickMedia}>
                <Text style={styles.imageButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                <Text style={styles.imageButtonText}>Take a Photo</Text>
              </TouchableOpacity>
              <Text style={styles.imageHint}>You can select up to {MAX_IMAGES} photos or videos</Text>
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

        {/* Tag Selection */}
        <TagSelector
          selectedTagIds={selectedTagIds}
          onSelectionChange={setSelectedTagIds}
        />

        {/* Recipe Toggle */}
        <TouchableOpacity
          style={[styles.recipeToggle, showRecipe && styles.recipeToggleActive]}
          onPress={() => setShowRecipe(!showRecipe)}
        >
          <Text style={[styles.recipeToggleText, showRecipe && styles.recipeToggleTextActive]}>
            {showRecipe ? 'Remove Recipe' : 'Add Recipe'}
          </Text>
        </TouchableOpacity>

        {/* Recipe Form */}
        {showRecipe && (
          <View style={styles.recipeForm}>
            <Text style={styles.recipeTitle}>Recipe Details</Text>

            {/* Cook time & Servings row */}
            <View style={styles.recipeRow}>
              <View style={styles.recipeField}>
                <Text style={styles.fieldLabel}>Cook Time (min)</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="30"
                  placeholderTextColor="#bbb"
                  keyboardType="number-pad"
                  value={cookTime}
                  onChangeText={setCookTime}
                />
              </View>
              <View style={styles.recipeField}>
                <Text style={styles.fieldLabel}>Servings</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="4"
                  placeholderTextColor="#bbb"
                  keyboardType="number-pad"
                  value={servings}
                  onChangeText={setServings}
                />
              </View>
            </View>

            {/* Difficulty picker */}
            <Text style={styles.fieldLabel}>Difficulty</Text>
            <View style={styles.difficultyRow}>
              {DIFFICULTY_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.difficultyOption,
                    difficulty === opt && styles.difficultyOptionActive,
                  ]}
                  onPress={() => setDifficulty(opt)}
                >
                  <Text
                    style={[
                      styles.difficultyText,
                      difficulty === opt && styles.difficultyTextActive,
                    ]}
                  >
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Ingredients */}
            <Text style={styles.sectionLabel}>Ingredients</Text>
            {ingredients.map((ing, index) => (
              <View key={index} style={styles.ingredientRow}>
                <TextInput
                  style={[styles.fieldInput, styles.ingredientName]}
                  placeholder="Ingredient"
                  placeholderTextColor="#bbb"
                  value={ing.name}
                  onChangeText={(v) => updateIngredient(index, 'name', v)}
                />
                <TextInput
                  style={[styles.fieldInput, styles.ingredientQty]}
                  placeholder="Qty"
                  placeholderTextColor="#bbb"
                  value={ing.quantity}
                  onChangeText={(v) => updateIngredient(index, 'quantity', v)}
                />
                <TextInput
                  style={[styles.fieldInput, styles.ingredientUnit]}
                  placeholder="Unit"
                  placeholderTextColor="#bbb"
                  value={ing.unit}
                  onChangeText={(v) => updateIngredient(index, 'unit', v)}
                />
                {ingredients.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeIngredient(index)}
                  >
                    <Text style={styles.removeButtonText}>X</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={addIngredient}>
              <Text style={styles.addButtonText}>+ Add Ingredient</Text>
            </TouchableOpacity>

            {/* Steps */}
            <Text style={styles.sectionLabel}>Steps</Text>
            {steps.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <Text style={styles.stepNumber}>{index + 1}.</Text>
                <TextInput
                  style={[styles.fieldInput, styles.stepInput]}
                  placeholder="Describe this step..."
                  placeholderTextColor="#bbb"
                  multiline
                  value={step.instruction}
                  onChangeText={(v) => updateStep(index, v)}
                />
                {steps.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeStep(index)}
                  >
                    <Text style={styles.removeButtonText}>X</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={addStep}>
              <Text style={styles.addButtonText}>+ Add Step</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* Toast notification */}
      {toastMessage && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* Full-screen upload status overlay */}
      {uploadStatus && (
        <View style={styles.uploadOverlay}>
          {uploadStatus === 'uploading' && (
            <View style={styles.uploadContent}>
              <ActivityIndicator size="large" color="#FF6B35" />
              <Text style={styles.uploadTitle}>Uploading your post...</Text>
              <Text style={styles.uploadSubtitle}>This may take a moment</Text>
            </View>
          )}
          {uploadStatus === 'success' && (
            <View style={styles.uploadContent}>
              <View style={styles.uploadIconCircle}>
                <Ionicons name="checkmark" size={48} color="#fff" />
              </View>
              <Text style={styles.uploadTitle}>Post published!</Text>
              <Text style={styles.uploadSubtitle}>Redirecting to your feed...</Text>
            </View>
          )}
          {uploadStatus === 'error' && (
            <View style={styles.uploadContent}>
              <View style={[styles.uploadIconCircle, styles.uploadIconError]}>
                <Ionicons name="close" size={48} color="#fff" />
              </View>
              <Text style={styles.uploadTitle}>Upload failed</Text>
              <Text style={styles.uploadSubtitle}>{uploadError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setUploadStatus(null);
                  setUploadError(null);
                }}
              >
                <Text style={styles.retryButtonText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.retryButtonOutline}
                onPress={submitPost}
              >
                <Text style={styles.retryButtonOutlineText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderColor: '#eee',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelText: { fontSize: 16, color: '#666' },
  title: { fontSize: 18, fontWeight: 'bold' },
  postText: { fontSize: 16, fontWeight: 'bold', color: '#FF6B35' },
  disabledText: { color: '#ccc' },
  draftButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  draftButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B35',
  },
  draftsLink: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  draftsLinkText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
  },
  imageSection: { paddingVertical: 20 },
  imageCarousel: { height: 300 },
  carouselSlide: { width: SCREEN_WIDTH, alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: SCREEN_WIDTH - 48, height: 280, borderRadius: 12, backgroundColor: '#eee' },
  removeImageButton: { position: 'absolute', top: 8, right: 32, zIndex: 2 },
  videoOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  imageCounter: { textAlign: 'center', color: '#666', marginTop: 8, fontSize: 13, fontWeight: '500' },
  addMoreRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 },
  addMoreButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#FF6B35' },
  addMoreText: { fontSize: 14, fontWeight: '600', color: '#FF6B35' },
  imageHint: { fontSize: 13, color: '#999', marginTop: 8 },
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
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  uploadContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  uploadIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadIconError: {
    backgroundColor: '#e74c3c',
  },
  uploadTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    marginTop: 16,
    textAlign: 'center',
  },
  uploadSubtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 28,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButtonOutline: {
    marginTop: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FF6B35',
  },
  retryButtonOutlineText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
  toast: {
    position: 'absolute',
    bottom: 50,
    left: 24,
    right: 24,
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  toastText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Recipe toggle
  recipeToggle: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
    alignItems: 'center',
  },
  recipeToggleActive: {
    backgroundColor: '#FFF0E8',
  },
  recipeToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6B35',
  },
  recipeToggleTextActive: {
    color: '#CC4400',
  },

  // Recipe form
  recipeForm: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    backgroundColor: '#FFF8F0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFE0C2',
  },
  recipeTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 12,
  },
  recipeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  recipeField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    marginTop: 4,
  },
  difficultyOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  difficultyOptionActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FF6B35',
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  difficultyTextActive: {
    color: '#fff',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 8,
  },

  // Ingredients
  ingredientRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  ingredientName: { flex: 3 },
  ingredientQty: { flex: 1 },
  ingredientUnit: { flex: 1.5 },

  // Steps
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 6,
  },
  stepNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginTop: 10,
    width: 20,
  },
  stepInput: { flex: 1, minHeight: 44 },

  // Add/Remove buttons
  addButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#999',
  },
});
