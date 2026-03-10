import React, { createContext, useContext, useState } from "react";

export type Collection = {
  id: string
  name: string
  posts: string[]
}

type CollectionsContextType = {
  collections: Collection[];
  addCollection: (collection: Collection) => void;
};

const CollectionsContext = createContext<CollectionsContextType | null>(null);

// Manages user's collections
export const CollectionsProvider = ({ children }: any) => {

  // TODO: rework collection storage to reflect info from backend
  const [collections, setCollections] = useState<Collection[]>([
    {
        id: "123",
        name: "Favorites",
        posts: [],
    },
    {
        id: "456",
        name: "Inspiration",
        posts: [],
    },
    {
        id: "789",
        name: "Travel",
        posts: [],
    },
  ]);

  const addCollection = (collection: Collection) => {
    setCollections((prev) => [...prev, collection]);
  };

  return (
    <CollectionsContext.Provider value={{ collections, addCollection }}>
      {children}
    </CollectionsContext.Provider>
  );
};

export const useCollections = () => {
  const context = useContext(CollectionsContext);
  if (!context) throw new Error("useCollections must be inside provider");
  return context;
};