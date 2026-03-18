import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Alert, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect, useRef, useCallback } from "react";
import * as ImagePicker from 'expo-image-picker';
import { fetchMyProfile, updateMyProfile, uploadAvatar, getAvatarUrl, checkUsername, UserProfile } from "../../../../services/api";

export default function EditProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [originalUsername, setOriginalUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedCheckUsername = useCallback((value: string) => {
    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
    if (value.length < 3 || value === originalUsername) {
      setUsernameAvailable(value === originalUsername ? null : null);
      setCheckingUsername(false);
      return;
    }
    setCheckingUsername(true);
    usernameTimerRef.current = setTimeout(async () => {
      try {
        const { available } = await checkUsername(value);
        setUsernameAvailable(available);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
  }, [originalUsername]);

  useEffect(() => {
    loadProfile();
    return () => {
      if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
    };
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await fetchMyProfile();
      setDisplayName(profile.displayName || "");
      setUsername(profile.username || "");
      setOriginalUsername(profile.username || "");
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatarUrl || null);
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const pickAvatar = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUrl(result.assets[0].uri);
      setAvatarChanged(true);
    }
  };

  const handleSave = async () => {
    if (username.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters.");
      return;
    }
    if (username !== originalUsername && usernameAvailable === false) {
      Alert.alert("Error", "That username is already taken.");
      return;
    }

    setSaving(true);
    try {
      // Upload avatar if changed
      if (avatarChanged && avatarUrl) {
        await uploadAvatar(avatarUrl);
      }

      await updateMyProfile({
        displayName: displayName || null,
        username: username.toLowerCase(),
        bio: bio || null,
      });
      Alert.alert("Success", "Profile updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Profile Picture */}
      <Pressable style={styles.avatarSection} onPress={pickAvatar}>
        {avatarUrl ? (
          <Image source={{ uri: avatarChanged ? avatarUrl : getAvatarUrl(avatarUrl, displayName || username) }} style={styles.avatarImage} />
        ) : (
          <Ionicons name="person-circle-outline" size={100} color="#888" />
        )}
        <View style={styles.changePhoto}>
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </View>
      </Pressable>

      {/* Display Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter display name"
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
          onChangeText={(text) => {
            const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
            setUsername(cleaned);
            debouncedCheckUsername(cleaned);
          }}
          autoCapitalize="none"
          maxLength={20}
        />
        {username.length >= 3 && username !== originalUsername && (
          <View style={styles.usernameStatus}>
            {checkingUsername ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : usernameAvailable === true ? (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                <Text style={styles.usernameAvailable}>Available</Text>
              </>
            ) : usernameAvailable === false ? (
              <>
                <Ionicons name="close-circle" size={18} color="#e74c3c" />
                <Text style={styles.usernameTaken}>Taken</Text>
              </>
            ) : null}
          </View>
        )}
      </View>

      {/* Bio */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bio]}
          placeholder="Tell us about yourself"
          multiline
          value={bio}
          onChangeText={(text) => setBio(text.slice(0, 150))}
          maxLength={150}
        />
        <Text style={styles.charCount}>{bio.length}/150</Text>
      </View>

      {/* Save Button */}
      <Pressable style={[styles.saveButton, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>Save Changes</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },

  avatarSection: {
    alignItems: "center",
    marginBottom: 30,
  },

  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },

  changePhoto: {
    marginTop: 10,
  },

  changePhotoText: {
    color: "#007AFF",
    fontWeight: "500",
  },

  inputGroup: {
    marginBottom: 20,
  },

  label: {
    fontWeight: "600",
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
  },

  bio: {
    height: 80,
    textAlignVertical: "top",
  },

  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },

  usernameStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },

  usernameAvailable: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },

  usernameTaken: {
    fontSize: 13,
    color: '#e74c3c',
    fontWeight: '500',
  },

  saveButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },

  saveText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
