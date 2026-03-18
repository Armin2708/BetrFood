import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import { useCollections } from "../context/CollectionsContext";
import { usePostCollections } from "../hooks/usePostCollections";
import { colors } from "../constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { createCollection } from "@/services/api";

type Props = {
  visible: boolean;
  postId?: string;
  onClose: () => void;
  onCollectionsChange: () => void;
};

export default function SaveCollectionModal({
  visible,
  postId,
  onClose,
  onCollectionsChange,
}: Props) {
  const { collections, addCollection } = useCollections();
  const [newName, setNewName] = useState("");
  const { savedIds, toggleCollection } = usePostCollections(postId);

  const handleCreate = async () => {
    if (!newName.trim() || !postId) return;
    try {
      const created = await addCollection(newName.trim());
      setNewName("");
      await toggleCollection(created.id)
    } catch (error) {
      console.error("Failed to create collection:", error);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <Text style={styles.title} accessibilityRole="header">
                Save to Collection
              </Text>

              {collections.map((collection) => {
                const isSaved = savedIds.includes(collection.id);

                return (
                  <TouchableOpacity
                    key={collection.id}
                    onPress={() => {
                      toggleCollection(collection.id)
                      onCollectionsChange(); 
                    }}
                    style={styles.collectionItem}
                    accessibilityRole="button"
                    accessibilityLabel={`${
                      isSaved ? "Remove from" : "Save to"
                    } ${collection.name}`}
                  >
                    <Text>{collection.name}</Text>
                    <Ionicons
                      name={isSaved ? "bookmark" : "bookmark-outline"}
                      size={20}
                    />
                  </TouchableOpacity>
                );
              })}
              
              <View style={styles.createCollection}>
                <TextInput
                  placeholder="New collection..."
                  value={newName}
                  onChangeText={setNewName}
                  style={styles.input}
                  accessibilityLabel="New collection name"
                />

                <TouchableOpacity
                  disabled={newName.trim() === ""}
                  onPress={handleCreate}
                  style={newName.trim() === "" ? styles.disabledCreateButton : styles.createButton}
                  accessibilityRole="button"
                  accessibilityLabel="Create collection and save"
                >
                  <Text style={styles.createButtonText}>Create + Save</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
                <Text style={styles.closeText}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.backgroundPrimary,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  title: {
    fontWeight: "bold",
    fontSize: 18,
  },
  collectionItem: {
    flexDirection: "row", 
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  createCollection: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingVertical: 3,
    marginTop: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    width: "60%",
    //padding: 10,
    borderRadius: 8,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  disabledCreateButton: {
    backgroundColor: colors.placeholder,
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  createButtonText: {
    color: colors.white,
  },
  closeText: {
    textAlign: "center",
    marginTop: 10,
    color: colors.textTertiary,
  },
});
