import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Collection, useCollections } from "../context/CollectionsContext";

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
  const [newCollection, setNewCollection] = useState<Collection>(
    {
        id: "",
        name: "",
        posts: []
    });

  const createCollection = () => {
    // Ignores request if name was left empty
    if (!newCollection.name.trim()) return;

    addCollection(newCollection);
    onSave(newCollection);
    setNewCollection({
        id: "",
        name: "",
        posts: []
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
        <View style={{ backgroundColor: "white", padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
          <Text style={{ fontWeight: "bold", fontSize: 18 }}>
            Save to Collection
          </Text>

          {collections.map((collection) => (
            <TouchableOpacity
              key={collection.id}
              onPress={() => onSave(collection)}
              style={{ paddingVertical: 12 }}
            >
              <Text>{collection.name}</Text>
            </TouchableOpacity>
          ))}

          <TextInput
            placeholder="New collection..."
            value={newCollection.name}
            // Updates the name property of the collection to be added
            onChangeText={(text) => { 
                setNewCollection((prev) => (
                    {
                      ...prev,
                      name: text
                    })) 
                }
            }
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 8,
              padding: 10,
              marginTop: 10,
            }}
          />

          <TouchableOpacity
            onPress={createCollection}
            style={{
              backgroundColor: "#007AFF",
              padding: 10,
              borderRadius: 8,
              marginTop: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white" }}>Create + Save</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose}>
            <Text style={{ textAlign: "center", marginTop: 10, color: "gray" }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}