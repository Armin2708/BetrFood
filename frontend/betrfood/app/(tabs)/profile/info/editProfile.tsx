import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router"
import { useState } from "react";

export default function EditProfile() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");

  const router = useRouter()

  // TODO
  const handleSave = () => {
    console.log("Saved:", { username, email, bio });
    router.back()
  };

  return (
    <View style={styles.container}>
      {/* Profile Picture */}
      <View style={styles.avatarSection}>
        <Ionicons name="person-circle-outline" size={100} color="#888" />
        <Pressable style={styles.changePhoto}>
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </Pressable>
      </View>

      {/* Username */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter username"
          value={username}
          onChangeText={setUsername}
        />
      </View>

      {/* Email */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter email"
          value={email}
          onChangeText={setEmail}
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
          onChangeText={setBio}
        />
      </View>

      {/* Save Button */}
      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Save Changes</Text>
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