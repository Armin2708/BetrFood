import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { createPostApi, RecipeInput, addTagsToPost } from '../services/api';
import TagSelector from '../components/TagSelector';

const MAX_CAPTION_LENGTH = 500;
const DIFFICULTY_OPTIONS: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

interface IngredientField {
  name: string;
  quantity: string;
  unit: string;
}

interface StepField {
  instruction: string;
}

export default function CreatePostScreen() {
  const [image, setImage] = useState<string | null>(null);
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
    if (!image) {
      Alert.alert('Image required', 'Please select or take a photo first.');
      return;
    }
    setLoading(true);
    try {
      const recipeData = buildRecipeData();
      const post = await createPostApi(image, caption, recipeData);

      // Add tags if any selected
      if (selectedTagIds.length > 0) {
        await addTagsToPost(post.id, selectedTagIds);
      }

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
  scroll: { flexGrow: 1, paddingBottom: 40 },
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
