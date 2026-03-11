import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCollections } from "../../../../context/CollectionsContext";

export default function CollectionsScreen() {
  const router = useRouter();
  const { collections, loading, addCollection, removeCollection } = useCollections();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      setCreating(true);
      await addCollection(trimmed);
      setNewName("");
      setShowInput(false);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create collection");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "Delete Collection",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await removeCollection(id);
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete collection");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>Collections</Text>
        <Pressable onPress={() => setShowInput(!showInput)} style={styles.addButton}>
          <Ionicons name="add-circle-outline" size={28} color="#4CAF50" />
        </Pressable>
      </View>

      {/* Create input */}
      {showInput && (
        <View style={styles.createRow}>
          <TextInput
            style={styles.input}
            placeholder="Collection name..."
            placeholderTextColor="#999"
            value={newName}
            onChangeText={setNewName}
            autoFocus
            onSubmitEditing={handleCreate}
            returnKeyType="done"
          />
          <Pressable
            style={[styles.createButton, !newName.trim() && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={creating || !newName.trim()}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Collections list */}
      <FlatList
        data={collections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={collections.length === 0 ? styles.centered : undefined}
        renderItem={({ item }) => (
          <Pressable
            style={styles.collectionItem}
            onPress={() => router.push(`/profile/collections/${item.id}?name=${encodeURIComponent(item.name)}`)}
            onLongPress={() => handleDelete(item.id, item.name)}
          >
            <View style={styles.collectionIcon}>
              <Ionicons name="folder-outline" size={28} color="#4CAF50" />
            </View>
            <View style={styles.collectionInfo}>
              <Text style={styles.collectionName}>{item.name}</Text>
              <Text style={styles.collectionCount}>
                {item.postCount} {item.postCount === 1 ? "post" : "posts"}
              </Text>
            </View>
            <Pressable
              onPress={() => handleDelete(item.id, item.name)}
              hitSlop={8}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={20} color="#ccc" />
            </Pressable>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No collections yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to create your first collection
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  addButton: {
    padding: 4,
  },
  createRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#000",
    backgroundColor: "#fafafa",
  },
  createButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  collectionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  collectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#f0f8f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  collectionCount: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
    marginRight: 4,
  },
  separator: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginLeft: 78,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
