import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCollections, Collection } from "../../../../context/CollectionsContext";
import { getImageUrl, Post } from "../../../../services/api";
import VideoThumbnailView from "../../../../components/VideoThumbnail";
import SaveCollectionModal from "../../../../components/SaveCollectionModal";

const { width } = Dimensions.get("window");
const NUM_COLUMNS = 3;
const ITEM_SIZE = width / NUM_COLUMNS;

export default function CollectionDetailScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { fetchPostsForCollection, removePostFromCollection, savePostToCollection } = useCollections();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Single remove
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  // Multi-select
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [moveToCollectionModal, setMoveToCollectionModal] = useState(false);

  const loadPosts = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await fetchPostsForCollection(id);
      setPosts(data);
    } catch (error) {
      console.error("Failed to load collection posts:", error);
    } finally {
      setLoading(false);
    }
  }, [id, fetchPostsForCollection]);

  useFocusEffect(useCallback(() => { loadPosts(); }, [loadPosts]));

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelectItem = (postId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const handleRemovePost = (postId: string) => setRemoveTarget(postId);

  const confirmRemovePost = async () => {
    if (!removeTarget) return;
    const postId = removeTarget;
    setRemoveTarget(null);
    try {
      await removePostFromCollection(id, postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to remove post");
    }
  };

  const confirmBulkDelete = async () => {
    setBulkDeleteModal(false);
    try {
      await Promise.all([...selectedIds].map(postId => removePostFromCollection(id, postId)));
      setPosts(prev => prev.filter(p => !selectedIds.has(p.id)));
      exitSelectMode();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to remove posts");
    }
  };

  const handleMoveToCollection = async (targetCollections: Collection[]) => {
    setMoveToCollectionModal(false);
    try {
      await Promise.all(
        targetCollections.flatMap(col =>
          [...selectedIds].map(postId => savePostToCollection(col.id, postId))
        )
      );
      exitSelectMode();
      Alert.alert("Saved", `Added to ${targetCollections.length} collection${targetCollections.length !== 1 ? 's' : ''}.`);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save posts");
    }
  };

  const collectionName = name ? decodeURIComponent(name) : "Collection";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {selectMode ? (
          <>
            <Pressable onPress={exitSelectMode} style={styles.backButton}>
              <Ionicons name="close" size={24} color="#333" />
            </Pressable>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{selectedIds.size} selected</Text>
            </View>
          </>
        ) : (
          <>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </Pressable>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>{collectionName}</Text>
              <Text style={styles.headerCount}>
                {posts.length} {posts.length === 1 ? "post" : "posts"}
              </Text>
            </View>
            <Pressable onPress={() => setSelectMode(true)} style={styles.selectButton}>
              <Text style={styles.selectButtonText}>Select</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Bulk action bar */}
      {selectMode && (
        <View style={styles.bulkBar}>
          <Pressable
            style={[styles.bulkButton, styles.bulkButtonMove, selectedIds.size === 0 && styles.bulkButtonDisabled]}
            onPress={() => selectedIds.size > 0 && setMoveToCollectionModal(true)}
            disabled={selectedIds.size === 0}
          >
            <Ionicons name="folder-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.bulkButtonText}>Add to Collection</Text>
          </Pressable>
          <Pressable
            style={[styles.bulkButton, styles.bulkButtonDelete, selectedIds.size === 0 && styles.bulkButtonDisabled]}
            onPress={() => selectedIds.size > 0 && setBulkDeleteModal(true)}
            disabled={selectedIds.size === 0}
          >
            <Ionicons name="trash-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.bulkButtonText}>Remove</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <Pressable
                style={styles.gridItemContainer}
                onPress={() => selectMode ? toggleSelectItem(item.id) : router.push(`/post-detail?postId=${item.id}`)}
                onLongPress={() => { if (!selectMode) { setSelectMode(true); setSelectedIds(new Set([item.id])); } }}
              >
                {item.mediaType === 'video' ? (
                  <VideoThumbnailView videoUri={getImageUrl(item.imagePath)} style={[styles.gridItem, isSelected && styles.gridItemSelected]} />
                ) : (
                  <Image source={{ uri: getImageUrl(item.imagePath) }} style={[styles.gridItem, isSelected && styles.gridItemSelected]} />
                )}

                {selectMode && (
                  <View style={styles.selectionOverlay}>
                    <View style={[styles.selectionCircle, isSelected && styles.selectionCircleActive]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                  </View>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No posts in this collection</Text>
              <Text style={styles.emptySubtext}>Save posts to this collection from the post menu</Text>
            </View>
          }
        />
      )}

      {/* Single remove modal */}
      <Modal visible={!!removeTarget} transparent animationType="fade" onRequestClose={() => setRemoveTarget(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setRemoveTarget(null)}>
          <Pressable style={styles.modalBox} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Remove Post</Text>
            <Text style={styles.modalMessage}>Remove this post from the collection?</Text>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelButton} onPress={() => setRemoveTarget(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalDeleteButton} onPress={confirmRemovePost}>
                <Text style={styles.modalDeleteText}>Remove</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Bulk delete modal */}
      <Modal visible={bulkDeleteModal} transparent animationType="fade" onRequestClose={() => setBulkDeleteModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setBulkDeleteModal(false)}>
          <Pressable style={styles.modalBox} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Remove {selectedIds.size} Post{selectedIds.size !== 1 ? 's' : ''}</Text>
            <Text style={styles.modalMessage}>Remove {selectedIds.size} selected post{selectedIds.size !== 1 ? 's' : ''} from this collection?</Text>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelButton} onPress={() => setBulkDeleteModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalDeleteButton} onPress={confirmBulkDelete}>
                <Text style={styles.modalDeleteText}>Remove</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add to collection modal */}
      <SaveCollectionModal
        visible={moveToCollectionModal}
        onClose={() => setMoveToCollectionModal(false)}
        onSave={handleMoveToCollection}
        mode="save"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  backButton: { padding: 4, marginRight: 12 },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#000" },
  headerCount: { fontSize: 13, color: "#888", marginTop: 2 },
  selectButton: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: "#4CAF50",
  },
  selectButtonText: { fontSize: 14, fontWeight: "600", color: "#4CAF50" },
  bulkBar: {
    flexDirection: "row", gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
    backgroundColor: "#fafafa",
  },
  bulkButton: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", paddingVertical: 10, borderRadius: 8,
  },
  bulkButtonMove: { backgroundColor: "#4CAF50" },
  bulkButtonDelete: { backgroundColor: "#e74c3c" },
  bulkButtonDisabled: { opacity: 0.4 },
  bulkButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  gridItemContainer: { position: 'relative', width: ITEM_SIZE, height: ITEM_SIZE },
  gridItem: {
    width: ITEM_SIZE, height: ITEM_SIZE,
    backgroundColor: "#eee", borderWidth: 0.5, borderColor: "#fff",
  },
  gridItemSelected: { opacity: 0.7 },
  selectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end", alignItems: "flex-start", padding: 6,
  },
  selectionCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: "#fff",
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center", alignItems: "center",
  },
  selectionCircleActive: { backgroundColor: "#4CAF50", borderColor: "#4CAF50" },
  removeButton: { position: 'absolute', top: 4, right: 4, backgroundColor: '#fff', borderRadius: 11 },
  emptyContainer: { alignItems: "center", paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#666", marginTop: 16 },
  emptySubtext: { fontSize: 14, color: "#999", marginTop: 8, textAlign: "center", paddingHorizontal: 40 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalBox: { backgroundColor: "#fff", borderRadius: 14, padding: 24, width: 300 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#000", marginBottom: 8 },
  modalMessage: { fontSize: 14, color: "#666", lineHeight: 20, marginBottom: 20 },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalCancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: "#ddd", alignItems: "center" },
  modalCancelText: { fontSize: 15, fontWeight: "600", color: "#666" },
  modalDeleteButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: "#e74c3c", alignItems: "center" },
  modalDeleteText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});
