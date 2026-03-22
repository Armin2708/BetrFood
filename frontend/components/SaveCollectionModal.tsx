import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Collection, useCollections } from "../context/CollectionsContext";
import { colors } from "../constants/theme";

type Mode = "save" | "remove";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (collections: Collection[]) => void;
  onRemove?: (collections: Collection[]) => void;
  mode?: Mode;
  savedInCollections?: Collection[];
};

export default function SaveCollectionModal({
  visible,
  onClose,
  onSave,
  onRemove,
  mode = "save",
  savedInCollections = [],
}: Props) {
  const { collections, addCollection } = useCollections();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (visible && mode === "remove") {
      setSelected(new Set(savedInCollections.map(c => c.id)));
    } else if (visible && mode === "save") {
      setSelected(new Set());
    }
  }, [visible, mode]);

  const toggleCollection = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const selectedCollections = collections.filter(c => selected.has(c.id));
    if (mode === "save") {
      onSave(selectedCollections);
    } else {
      if (onRemove) onRemove(selectedCollections);
    }
    setSelected(new Set());
    setNewName("");
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await addCollection(newName.trim());
      setNewName("");
      setSelected(prev => new Set([...prev, created.id]));
    } catch (error) {
      console.error("Failed to create collection:", error);
    } finally {
      setCreating(false);
    }
  };

  const isRemoveMode = mode === "remove";
  const title = isRemoveMode ? "Remove from Collections" : "Save to Collections";
  const confirmLabel = selected.size === 0
    ? isRemoveMode ? "Select collections to remove from" : "Select collections to save to"
    : isRemoveMode
      ? `Remove from ${selected.size} collection${selected.size !== 1 ? 's' : ''}`
      : `Save to ${selected.size} collection${selected.size !== 1 ? 's' : ''}`;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {collections.map((collection) => {
              const isSelected = selected.has(collection.id);
              return (
                <TouchableOpacity
                  key={collection.id}
                  onPress={() => toggleCollection(collection.id)}
                  style={styles.collectionItem}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${isSelected ? 'Deselect' : 'Select'} ${collection.name}`}
                  accessibilityState={{ checked: isSelected }}
                >
                  <View style={styles.collectionLeft}>
                    <View style={styles.folderIcon}>
                      <Ionicons
                        name="folder-outline"
                        size={22}
                        color={isRemoveMode ? '#e74c3c' : colors.primary}
                      />
                    </View>
                    <Text style={styles.collectionName}>{collection.name}</Text>
                  </View>
                  <View style={[
                    styles.checkbox,
                    isSelected && (isRemoveMode ? styles.checkboxSelectedRemove : styles.checkboxSelectedSave),
                  ]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Create new collection — save mode only */}
          {!isRemoveMode && (
            <View style={styles.createRow}>
              <TextInput
                placeholder="New collection name..."
                value={newName}
                onChangeText={setNewName}
                style={styles.input}
                accessibilityLabel="New collection name"
                onSubmitEditing={handleCreate}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={handleCreate}
                style={[styles.createButton, !newName.trim() && styles.createButtonDisabled]}
                disabled={creating || !newName.trim()}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.confirmButton,
              isRemoveMode && styles.confirmButtonRemove,
              selected.size === 0 && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={selected.size === 0}
          >
            <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
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
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: "bold",
    fontSize: 18,
    color: colors.textPrimary,
  },
  list: {
    maxHeight: 280,
  },
  collectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  collectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  folderIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  collectionName: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelectedSave: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxSelectedRemove: {
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c',
  },
  createRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.4,
  },
  createButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  confirmButtonRemove: {
    backgroundColor: '#e74c3c',
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  cancelText: {
    textAlign: "center",
    color: colors.textTertiary,
    fontSize: 15,
  },
});
