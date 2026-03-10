import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AuthContext } from '../../../../context/AuthenticationContext';
import { fetchUserProfile, updateUserProfile } from '../../../../services/api';

// TODO: replace with real user ID from AuthContext once backend auth is wired up
const CURRENT_USER_ID = 'current-user';

export default function EditProfile() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const userId = user?.id ?? CURRENT_USER_ID;

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Load current profile ──────────────────────────────────────────────────
  useEffect(() => {
    fetchUserProfile(userId)
      .then((profile) => {
        setUsername(profile.username ?? '');
        setDisplayName(profile.displayName ?? '');
        setBio(profile.bio ?? '');
      })
      .catch((e) => console.error('Failed to load profile:', e))
      .finally(() => setLoading(false));
  }, [userId]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Username required', 'Please enter a username.');
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile(userId, {
        username: username.trim(),
        displayName: displayName.trim() || null,
        bio: bio.trim() || null,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <Ionicons name="person-circle-outline" size={100} color="#888" />
        <Pressable style={styles.changePhoto}>
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </Pressable>
      </View>

      {/* Display name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your full name"
          value={displayName}
          onChangeText={setDisplayName}
        />
      </View>

      {/* Username */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
      </View>

      {/* Bio */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          placeholder="Tell us about yourself"
          multiline
          value={bio}
          onChangeText={setBio}
          maxLength={150}
        />
        <Text style={styles.charCount}>{bio.length}/150</Text>
      </View>

      {/* Cooking Preferences link */}
      <TouchableOpacity
        style={styles.preferencesRow}
        onPress={() => router.push('/profile/info/preferences')}
      >
        <View style={styles.preferencesLeft}>
          <Ionicons name="restaurant-outline" size={22} color="#FF6B35" />
          <View>
            <Text style={styles.preferencesLabel}>Cooking Preferences</Text>
            <Text style={styles.preferencesSub}>Cuisines, skill level, equipment</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#ccc" />
      </TouchableOpacity>

      {/* Save */}
      <Pressable
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>Save Changes</Text>
        )}
      </Pressable>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  changePhoto: { marginTop: 10 },
  changePhotoText: { color: '#FF6B35', fontWeight: '500' },
  inputGroup: { marginBottom: 20 },
  label: { fontWeight: '600', marginBottom: 6, color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 15,
    color: '#333',
  },
  bioInput: { height: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: '#ccc', textAlign: 'right', marginTop: 4 },
  preferencesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 24,
  },
  preferencesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  preferencesLabel: { fontSize: 15, fontWeight: '600', color: '#222' },
  preferencesSub: { fontSize: 12, color: '#999', marginTop: 1 },
  saveButton: {
    backgroundColor: '#FF6B35',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
