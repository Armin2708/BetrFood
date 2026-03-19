import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Alert, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import * as ImagePicker from 'expo-image-picker';
import { fetchMyProfile, updateMyProfile, uploadAvatar, getImageUrl, UserProfile } from "../../../../services/api";
import { colors, spacing } from "../../../../constants/theme";

export default function EditProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await fetchMyProfile();
      setDisplayName(profile.displayName || "");
      setUsername(profile.username || "");
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUrl(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (username.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters.");
      return;
    }

    setSaving(true);
    try {
      let finalAvatarUrl = avatarUrl;
      if (avatarUrl && avatarUrl.startsWith('file://')) {
        finalAvatarUrl = await uploadAvatar(avatarUrl);
      }
      await updateMyProfile({
        displayName: displayName || null,
        username: username.toLowerCase(),
        bio: bio || null,
        avatarUrl: finalAvatarUrl,
      });
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Profile Picture */}
      <Pressable style={styles.avatarSection} onPress={pickAvatar} accessibilityRole="button" accessibilityLabel="Change profile photo">
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl.startsWith('/uploads/') ? getImageUrl(avatarUrl) : avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={44} color={colors.textQuaternary} />
          </View>
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
          onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          autoCapitalize="none"
          maxLength={20}
        />
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
      <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving} accessibilityRole="button" accessibilityLabel="Save profile changes">
        {saving ? (
          <ActivityIndicator color={colors.white} />
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
    backgroundColor: colors.backgroundPrimary,
    padding: spacing.xl,
  },

  avatarSection: {
    alignItems: "center",
    marginBottom: 30,
    minHeight: 44,
  },

  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },

  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  changePhoto: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },

  changePhotoText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 14,
  },

  inputGroup: {
    marginBottom: spacing.xl,
  },

  label: {
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 6,
    fontSize: 14,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    borderRadius: 8,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundMuted,
  },

  bio: {
    height: 80,
    textAlignVertical: "top",
  },

  charCount: {
    fontSize: 12,
    color: colors.textQuaternary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },

  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: spacing.xl,
    minHeight: 48,
    justifyContent: 'center',
  },

  saveButtonDisabled: {
    opacity: 0.5,
  },

  saveText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 16,
  },
});
