import { useEffect, useState, useCallback } from "react";
import { useCollections } from "../context/CollectionsContext";

export const usePostCollections = (postId?: string) => {
  const {
    fetchCollectionsForPost,
    savePostToCollection,
    removePostFromCollection,
  } = useCollections();

  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Load initial state
  const loadSavedIds = useCallback(async () => {
    if (!postId) return;
    try {
    setLoading(true);
    const ids = await fetchCollectionsForPost(postId);
    setSavedIds(ids);
    } catch (e) {
    console.error("Failed to load post collections:", e);
    } finally {
    setLoading(false);
    }
}, [postId, fetchCollectionsForPost]);

useEffect(() => {
    loadSavedIds();
}, [loadSavedIds]);

  // Toggle save
  const toggleCollection = useCallback(
    async (collectionId: string) => {
      if (!postId) return;

      const isSaved = savedIds.includes(collectionId);

      try {
        if (isSaved) {
          await removePostFromCollection(collectionId, postId);
        } else {
          await savePostToCollection(collectionId, postId);
        }
        // Refresh local state after operation
        await loadSavedIds();
      } catch (e) {
        console.error("Failed to toggle collection:", e);
      }
    },
    [postId, savedIds]
  );

  return {
    savedIds,
    isSaved: savedIds.length > 0,
    toggleCollection,
    refreshSaved: loadSavedIds, // for syncing if needed
    loading,
  };
};