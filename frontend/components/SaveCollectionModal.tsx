import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { Collection, useCollections } from "../context/CollectionsContext";
import { colors } from "../constants/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (collection: Collection) => void;
};

export default function SaveCollectionModal({
  visible,
  onClose,
  onSave,
}: Props) {
  const { collections, addCollection } = useCollections();
  const [newName, setNewName] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const created = await addCollection(newName.trim());
      onSave(created);
      setNewName("");
    } catch (error) {
      console.error("Failed to create collection:", error);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title} accessibilityRole="header">
            Save to Collection
          </Text>

          {collections.map((collection) => (
            <TouchableOpacity
              key={collection.id}
              onPress={() => onSave(collection)}
              style={styles.collectionItem}
              accessibilityRole="button"
              accessibilityLabel={`Save to ${collection.name}`}
            >
              <Text>{collection.name}</Text>
            </TouchableOpacity>
          ))}

          <TextInput
            placeholder="New collection..."
            value={newName}
            onChangeText={setNewName}
            style={styles.input}
            accessibilityLabel="New collection name"
          />

          <TouchableOpacity
            onPress={handleCreate}
            style={styles.createButton}
            accessibilityRole="button"
            accessibilityLabel="Create collection and save"
          >
            <Text style={styles.createButtonText}>Create + Save</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cancel">
            <Text style={styles.cancelText}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingVertical: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  createButton: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  createButtonText: {
    color: colors.white,
  },
  cancelText: {
    textAlign: "center",
    marginTop: 10,
    color: colors.textTertiary,
  },
});
