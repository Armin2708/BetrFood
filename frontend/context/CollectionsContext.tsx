import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  fetchCollections as apiFetchCollections,
  createCollection as apiCreateCollection,
  deleteCollection as apiDeleteCollection,
  addPostToCollection as apiAddPostToCollection,
  removePostFromCollection as apiRemovePostFromCollection,
  fetchCollectionPosts as apiFetchCollectionPosts,
} from "../services/api";
import { AuthContext } from "./AuthenticationContext";

export type Collection = {
  id: string;
  name: string;
  postCount: number;
  coverImage?: string | null;
  coverMediaType?: string | null;
};

type CollectionsContextType = {
  collections: Collection[];
  loading: boolean;
  addCollection: (name: string) => Promise<Collection>;
  removeCollection: (id: string) => Promise<void>;
  savePostToCollection: (collectionId: string, postId: string) => Promise<void>;
  removePostFromCollection: (collectionId: string, postId: string) => Promise<void>;
  fetchPostsForCollection: (collectionId: string) => Promise<any[]>;
  refreshCollections: () => Promise<void>;
};

const CollectionsContext = createContext<CollectionsContextType | null>(null);

export const CollectionsProvider = ({ children }: any) => {
  const { loading: authLoading, token } = useContext(AuthContext);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCollections = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetchCollections();
      const mapped: Collection[] = (data ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        postCount: c.postCount ?? c.post_count ?? 0,
        coverImage: c.coverImage ?? c.cover_image ?? null,
        coverMediaType: c.coverMediaType ?? c.cover_media_type ?? null,
      }));
      setCollections(mapped);
    } catch (error) {
      console.error("Failed to load collections:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !token) {
      setLoading(false);
      return;
    }
    loadCollections();
  }, [authLoading, token, loadCollections]);

  const addCollection = async (name: string): Promise<Collection> => {
    const result = await apiCreateCollection(name);
    const newCollection: Collection = {
      id: result.id,
      name: result.name,
      postCount: 0,
    };
    setCollections((prev) => [...prev, newCollection]);
    return newCollection;
  };

  const removeCollection = async (id: string): Promise<void> => {
    await apiDeleteCollection(id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
  };

  const savePostToCollection = async (collectionId: string, postId: string): Promise<void> => {
    await apiAddPostToCollection(collectionId, postId);
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId ? { ...c, postCount: c.postCount + 1 } : c
      )
    );
  };

  const removePostFromCollectionFn = async (collectionId: string, postId: string): Promise<void> => {
    await apiRemovePostFromCollection(collectionId, postId);
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId ? { ...c, postCount: Math.max(0, c.postCount - 1) } : c
      )
    );
  };

  const fetchPostsForCollection = async (collectionId: string): Promise<any[]> => {
    const data = await apiFetchCollectionPosts(collectionId);
    return Array.isArray(data) ? data : data.posts ?? [];
  };

  return (
    <CollectionsContext.Provider
      value={{
        collections,
        loading,
        addCollection,
        removeCollection,
        savePostToCollection,
        removePostFromCollection: removePostFromCollectionFn,
        fetchPostsForCollection,
        refreshCollections: loadCollections,
      }}
    >
      {children}
    </CollectionsContext.Provider>
  );
};

export const useCollections = () => {
  const context = useContext(CollectionsContext);
  if (!context) throw new Error("useCollections must be inside provider");
  return context;
};
