import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import {
  checkUsername,
  updateMyProfile,
  uploadAvatar,
  completeOnboarding,
  updatePreferences,
} from '../../services/api';
import { AuthContext } from '../../context/AuthenticationContext';
import { colors } from '../../constants/theme';

const DIETARY_TAGS = [
  { id: 17, name: 'Vegan' },
  { id: 18, name: 'Vegetarian' },
  { id: 19, name: 'Gluten-Free' },
  { id: 20, name: 'Keto' },
  { id: 21, name: 'Paleo' },
  { id: 22, name: 'Dairy-Free' },
  { id: 23, name: 'Nut-Free' },
  { id: 24, name: 'Low-Carb' },
];

const ALLERGY_OPTIONS = [
  'Peanuts', 'Tree Nuts', 'Milk', 'Eggs', 'Wheat',
  'Soy', 'Fish', 'Shellfish', 'Sesame',
];

const CUISINE_OPTIONS = [
  'Italian', 'Mexican', 'Chinese', 'Japanese', 'Indian',
  'Thai', 'Mediterranean', 'Korean', 'French', 'American',
  'Middle Eastern', 'Ethiopian', 'Vietnamese', 'Greek', 'Caribbean',
];

const TOTAL_STEPS = 5;

export default function OnboardingSetup() {
  const router = useRouter();
  const { setNeedsOnboarding } = useContext(AuthContext);

  const [step, setStep] = useState(1);

  // Step 1
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 2
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [bio, setBio] = useState('');

  // Step 3
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<number[]>([]);

  // Step 4
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);

  // Step 5
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);

  // Username validation and debounced availability check
  const sanitizeUsername = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9_]/g, '');
  };

  const handleUsernameChange = useCallback((text: string) => {
    const sanitized = sanitizeUsername(text);
    setUsername(sanitized);
    setUsernameAvailable(null);

    if (usernameTimerRef.current) {
      clearTimeout(usernameTimerRef.current);
    }

    if (sanitized.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    usernameTimerRef.current = setTimeout(async () => {
      try {
        const result = await checkUsername(sanitized);
        setUsernameAvailable(result.available);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
  }, []);

  const isUsernameValid = username.length >= 3 && username.length <= 20 && usernameAvailable === true;

  // Step 2: Pick avatar
  const pickAvatar = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  // Step 3: Toggle dietary tag
  const toggleDietaryTag = (tagId: number) => {
    setSelectedDietaryTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  // Step 4: Toggle allergy
  const toggleAllergy = (allergy: string) => {
    setSelectedAllergies((prev) =>
      prev.includes(allergy) ? prev.filter((a) => a !== allergy) : [...prev, allergy]
    );
  };

  // Step 5: Toggle cuisine
  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine]
    );
  };

  // Finish onboarding
  const handleFinish = async () => {
    setSubmitting(true);
    try {
      // Upload avatar first if one was selected
      if (avatarUri) {
        await uploadAvatar(avatarUri);
      }

      await updateMyProfile({
        displayName: displayName || null,
        username,
        bio: bio || null,
        dietaryPreferences: selectedDietaryTags,
      });

      if (selectedAllergies.length > 0 || selectedCuisines.length > 0) {
        await updatePreferences({
          allergies: selectedAllergies,
          cuisines: selectedCuisines,
        });
      }

      await completeOnboarding();
      setNeedsOnboarding(false);
      router.replace('/feeds');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete setup. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Render progress indicator
  const renderProgress = () => (
    <View style={styles.progressContainer}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressDot,
            i + 1 <= step ? styles.progressDotActive : styles.progressDotInactive,
          ]}
        />
      ))}
    </View>
  );

  // Render username status icon
  const renderUsernameStatus = () => {
    if (username.length < 3) return null;
    if (checkingUsername) {
      return <ActivityIndicator size="small" color="#999" style={styles.usernameStatus} />;
    }
    if (usernameAvailable === true) {
      return <Ionicons name="checkmark-circle" size={22} color={colors.success} style={styles.usernameStatus} />;
    }
    if (usernameAvailable === false) {
      return <Ionicons name="close-circle" size={22} color={colors.error} style={styles.usernameStatus} />;
    }
    return null;
  };

  // Step 1: Display Name & Username
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Let's set up your profile</Text>
      <Text style={styles.stepSubtitle}>Choose a display name and unique username</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Display Name (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Username (required)</Text>
        <View style={styles.usernameInputRow}>
          <Text style={styles.usernamePrefix}>@</Text>
          <TextInput
            style={[styles.input, styles.usernameInput]}
            placeholder="username"
            value={username}
            onChangeText={handleUsernameChange}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
          {renderUsernameStatus()}
        </View>
        {username.length > 0 && username.length < 3 && (
          <Text style={styles.helperText}>Username must be at least 3 characters</Text>
        )}
        {usernameAvailable === false && (
          <Text style={styles.errorText}>This username is already taken</Text>
        )}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.nextButton, !isUsernameValid && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!isUsernameValid}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Step 2: Avatar & Bio
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Add a photo and bio</Text>
      <Text style={styles.stepSubtitle}>Help others get to know you</Text>

      <TouchableOpacity style={styles.avatarPicker} onPress={pickAvatar}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="camera" size={40} color="#999" />
            <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Bio (optional)</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          placeholder="Tell us about yourself..."
          value={bio}
          onChangeText={(text) => setBio(text.slice(0, 150))}
          multiline
          maxLength={150}
        />
        <Text style={styles.charCount}>{bio.length}/150</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={handleNext} style={styles.skipLink}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );

  // Step 3: Dietary Preferences
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Dietary Preferences</Text>
      <Text style={styles.stepSubtitle}>Select any that apply to you</Text>

      <View style={styles.tagGrid}>
        {DIETARY_TAGS.map((tag) => {
          const selected = selectedDietaryTags.includes(tag.id);
          return (
            <TouchableOpacity
              key={tag.id}
              style={[styles.tagChip, selected && styles.tagChipSelected]}
              onPress={() => toggleDietaryTag(tag.id)}
            >
              <Text style={[styles.tagChipText, selected && styles.tagChipTextSelected]}>
                {tag.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={handleNext} style={styles.skipLink}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );

  // Step 4: Allergies
  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Any food allergies?</Text>
      <Text style={styles.stepSubtitle}>Select any allergies so we can warn you</Text>

      <View style={styles.tagGrid}>
        {ALLERGY_OPTIONS.map((allergy) => {
          const selected = selectedAllergies.includes(allergy);
          return (
            <TouchableOpacity
              key={allergy}
              style={[styles.tagChip, selected && styles.tagChipSelected]}
              onPress={() => toggleAllergy(allergy)}
            >
              <Text style={[styles.tagChipText, selected && styles.tagChipTextSelected]}>
                {allergy}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={handleNext} style={styles.skipLink}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );

  // Step 5: Favorite Cuisines
  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Favorite cuisines</Text>
      <Text style={styles.stepSubtitle}>Pick cuisines you love to personalize your feed</Text>

      <View style={styles.tagGrid}>
        {CUISINE_OPTIONS.map((cuisine) => {
          const selected = selectedCuisines.includes(cuisine);
          return (
            <TouchableOpacity
              key={cuisine}
              style={[styles.tagChip, selected && styles.tagChipSelected]}
              onPress={() => toggleCuisine(cuisine)}
            >
              <Text style={[styles.tagChipText, selected && styles.tagChipTextSelected]}>
                {cuisine}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, submitting && styles.buttonDisabled]}
          onPress={handleFinish}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextButtonText}>Finish</Text>
          )}
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={handleFinish} style={styles.skipLink} disabled={submitting}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {renderProgress()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 8,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  progressDotInactive: {
    backgroundColor: '#ddd',
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  usernameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernamePrefix: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
  },
  usernameStatus: {
    marginLeft: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 120,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  backButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  skipLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  skipText: {
    color: '#999',
    fontSize: 14,
  },
  // Avatar
  avatarPicker: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  avatarPlaceholderText: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  // Dietary tags
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  tagChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.recipeBackground,
  },
  tagChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tagChipTextSelected: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
});
