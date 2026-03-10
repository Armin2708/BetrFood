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
import { fetchPost, updatePost, getImageUrl, fetchPostTags, addTagsToPost, removeTagFromPost, fetchRecipe, createRecipe, updateRecipe, RecipeInput, Recipe } from '../services/api';
import TagSelector from '../components/TagSelector';

const DIFFICULTY_OPTIONS: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

interface IngredientField { name: string; quantity: string; unit: string; }
interface StepField { instruction: string; }

export default function EditPostScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();

  const [caption, setCaption] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [originalTagIds, setOriginalTagIds] = useState<number[]>([]);

  // Recipe state
  const [hasRecipe, setHasRecipe] = useState(false);
  const [showRecipe, setShowRecipe] = useState(false);
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [ingredients, setIngredients] = useState<IngredientField[]>([{ name: '', quantity: '', unit: '' }]);
  const [steps, setSteps] = useState<StepField[]>([{ instruction: '' }]);

  useEffect(() => {
    if (!postId) return;
    loadPost();
  }, [postId]);

  async function loadPost() {
    try {
      setLoading(true);
      const [post, tags] = await Promise.all([
        fetchPost(postId!),
        fetchPostTags(postId!),
      ]);
      setCaption(post.caption || '');
      setImagePath(post.imagePath || '');
      const tagIds = tags.map(t => t.id);
      setSelectedTagIds(tagIds);
      setOriginalTagIds(tagIds);

      // Load recipe if exists
      try {
        const recipe = await fetchRecipe(postId!);
        setHasRecipe(true);
        setShowRecipe(true);
        setCookTime(recipe.cookTime != null ? String(recipe.cookTime) : '');
        setServings(recipe.servings != null ? String(recipe.servings) : '');
        setDifficulty(recipe.difficulty || 'easy');
        setIngredients(
          recipe.ingredients.length > 0
            ? recipe.ingredients.map(i => ({ name: i.name, quantity: i.quantity || '', unit: i.unit || '' }))
            : [{ name: '', quantity: '', unit: '' }]
        );
        setSteps(
          recipe.steps.length > 0
            ? recipe.steps.map(s => ({ instruction: s.instruction }))
            : [{ instruction: '' }]
        );
      } catch {
        // No recipe exists - that's fine
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load post.');
      router.back();
    } finally {
      setLoading(false);
    }
  }

  // Recipe helpers
  const addIngredient = () => setIngredients([...ingredients, { name: '', quantity: '', unit: '' }]);
  const removeIngredient = (i: number) => { if (ingredients.length > 1) setIngredients(ingredients.filter((_, idx) => idx !== i)); };
  const updateIngredient = (i: number, field: keyof IngredientField, value: string) => {
    const updated = [...ingredients]; updated[i] = { ...updated[i], [field]: value }; setIngredients(updated);
  };
  const addStep = () => setSteps([...steps, { instruction: '' }]);
  const removeStep = (i: number) => { if (steps.length > 1) setSteps(steps.filter((_, idx) => idx !== i)); };
  const updateStep = (i: number, value: string) => { const updated = [...steps]; updated[i] = { instruction: value }; setSteps(updated); };

  async function handleSave() {
    if (!postId) return;

    setSaving(true);
    try {
      await updatePost(postId, { caption });

      // Determine which tags were added and removed
      const tagsToAdd = selectedTagIds.filter(id => !originalTagIds.includes(id));
      const tagsToRemove = originalTagIds.filter(id => !selectedTagIds.includes(id));

      // Apply tag changes in parallel
      const tagPromises: Promise<any>[] = [];
      if (tagsToAdd.length > 0) {
        tagPromises.push(addTagsToPost(postId, tagsToAdd));
      }
      for (const tagId of tagsToRemove) {
        tagPromises.push(removeTagFromPost(postId, tagId));
      }
      await Promise.all(tagPromises);

      // Save recipe if shown
      if (showRecipe) {
        const validIngredients = ingredients.filter(ing => ing.name.trim() !== '');
        const validSteps = steps.filter(step => step.instruction.trim() !== '');
        const recipeData: RecipeInput = {
          cookTime: cookTime ? parseInt(cookTime, 10) : null,
          servings: servings ? parseInt(servings, 10) : null,
          difficulty,
          ingredients: validIngredients.map(ing => ({ name: ing.name.trim(), quantity: ing.quantity.trim() || undefined, unit: ing.unit.trim() || undefined })),
          steps: validSteps.map(step => ({ instruction: step.instruction.trim() })),
        };
        if (hasRecipe) {
          await updateRecipe(postId, recipeData);
        } else {
          await createRecipe(postId, recipeData);
        }
      }

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
            {showRecipe ? 'Hide Recipe' : (hasRecipe ? 'Edit Recipe' : 'Add Recipe')}
          </Text>
        </TouchableOpacity>

        {showRecipe && (
          <View style={styles.recipeForm}>
            <Text style={styles.recipeTitle}>Recipe Details</Text>

            <View style={styles.recipeRow}>
              <View style={styles.recipeField}>
                <Text style={styles.fieldLabel}>Cook Time (min)</Text>
                <TextInput style={styles.fieldInput} placeholder="30" placeholderTextColor="#bbb" keyboardType="number-pad" value={cookTime} onChangeText={setCookTime} />
              </View>
              <View style={styles.recipeField}>
                <Text style={styles.fieldLabel}>Servings</Text>
                <TextInput style={styles.fieldInput} placeholder="4" placeholderTextColor="#bbb" keyboardType="number-pad" value={servings} onChangeText={setServings} />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Difficulty</Text>
            <View style={styles.difficultyRow}>
              {DIFFICULTY_OPTIONS.map(opt => (
                <TouchableOpacity key={opt} style={[styles.difficultyOption, difficulty === opt && styles.difficultyOptionActive]} onPress={() => setDifficulty(opt)}>
                  <Text style={[styles.difficultyText, difficulty === opt && styles.difficultyTextActive]}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Ingredients</Text>
            {ingredients.map((ing, index) => (
              <View key={index} style={styles.ingredientRow}>
                <TextInput style={[styles.fieldInput, styles.ingredientName]} placeholder="Ingredient" placeholderTextColor="#bbb" value={ing.name} onChangeText={(v) => updateIngredient(index, 'name', v)} />
                <TextInput style={[styles.fieldInput, styles.ingredientQty]} placeholder="Qty" placeholderTextColor="#bbb" value={ing.quantity} onChangeText={(v) => updateIngredient(index, 'quantity', v)} />
                <TextInput style={[styles.fieldInput, styles.ingredientUnit]} placeholder="Unit" placeholderTextColor="#bbb" value={ing.unit} onChangeText={(v) => updateIngredient(index, 'unit', v)} />
                {ingredients.length > 1 && (
                  <TouchableOpacity style={styles.removeButton} onPress={() => removeIngredient(index)}><Text style={styles.removeButtonText}>X</Text></TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={addIngredient}><Text style={styles.addButtonText}>+ Add Ingredient</Text></TouchableOpacity>

            <Text style={styles.sectionLabel}>Steps</Text>
            {steps.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <Text style={styles.stepNumber}>{index + 1}.</Text>
                <TextInput style={[styles.fieldInput, styles.stepInput]} placeholder="Describe this step..." placeholderTextColor="#bbb" multiline value={step.instruction} onChangeText={(v) => updateStep(index, v)} />
                {steps.length > 1 && (
                  <TouchableOpacity style={styles.removeButton} onPress={() => removeStep(index)}><Text style={styles.removeButtonText}>X</Text></TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={addStep}><Text style={styles.addButtonText}>+ Add Step</Text></TouchableOpacity>
          </View>
        )}

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
  recipeToggle: { marginBottom: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#FF6B35', alignItems: 'center' },
  recipeToggleActive: { backgroundColor: '#FFF0E8' },
  recipeToggleText: { fontSize: 15, fontWeight: '600', color: '#FF6B35' },
  recipeToggleTextActive: { color: '#CC4400' },
  recipeForm: { marginBottom: 16, padding: 14, backgroundColor: '#FFF8F0', borderRadius: 10, borderWidth: 1, borderColor: '#FFE0C2' },
  recipeTitle: { fontSize: 17, fontWeight: 'bold', color: '#FF6B35', marginBottom: 12 },
  recipeRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  recipeField: { flex: 1 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 4 },
  fieldInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, backgroundColor: '#fff' },
  difficultyRow: { flexDirection: 'row', gap: 8, marginBottom: 14, marginTop: 4 },
  difficultyOption: { flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#fff' },
  difficultyOptionActive: { borderColor: '#FF6B35', backgroundColor: '#FF6B35' },
  difficultyText: { fontSize: 14, fontWeight: '600', color: '#666' },
  difficultyTextActive: { color: '#fff' },
  sectionLabel: { fontSize: 15, fontWeight: 'bold', color: '#333', marginTop: 8, marginBottom: 8 },
  ingredientRow: { flexDirection: 'row', gap: 6, marginBottom: 8, alignItems: 'center' },
  ingredientName: { flex: 3 },
  ingredientQty: { flex: 1 },
  ingredientUnit: { flex: 1.5 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 6 },
  stepNumber: { fontSize: 15, fontWeight: 'bold', color: '#FF6B35', marginTop: 10, width: 20 },
  stepInput: { flex: 1, minHeight: 44 },
  addButton: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, marginBottom: 8 },
  addButtonText: { fontSize: 14, fontWeight: '600', color: '#FF6B35' },
  removeButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  removeButtonText: { fontSize: 13, fontWeight: 'bold', color: '#999' },
});
