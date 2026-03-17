import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  fetchPantryItems as apiFetchPantryItems,
  createPantryItem as apiCreatePantryItem,
  updatePantryItem as apiUpdatePantryItem,
  deletePantryItem as apiDeletePantryItem,
  PantryItem,
  PantryItemInput,
} from '../services/api';
import { AuthContext } from './AuthenticationContext';

type PantryContextType = {
  items: PantryItem[];
  loading: boolean;
  addItem: (item: PantryItemInput) => Promise<PantryItem>;
  editItem: (id: string, updates: Partial<PantryItemInput>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  refreshItems: () => Promise<void>;
};

const PantryContext = createContext<PantryContextType | null>(null);

export const PantryProvider = ({ children }: { children: React.ReactNode }) => {
  const { loading: authLoading, token } = useContext(AuthContext);
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetchPantryItems();
      setItems(data ?? []);
    } catch (error) {
      console.error('Failed to load pantry items:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !token) {
      setLoading(false);
      return;
    }
    loadItems();
  }, [authLoading, token, loadItems]);

  const addItem = async (item: PantryItemInput): Promise<PantryItem> => {
    const created = await apiCreatePantryItem(item);
    setItems((prev) => [...prev, created]);
    return created;
  };

  const editItem = async (id: string, updates: Partial<PantryItemInput>): Promise<void> => {
    const updated = await apiUpdatePantryItem(id, updates);
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
  };

  const removeItem = async (id: string): Promise<void> => {
    await apiDeletePantryItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <PantryContext.Provider
      value={{ items, loading, addItem, editItem, removeItem, refreshItems: loadItems }}
    >
      {children}
    </PantryContext.Provider>
  );
};

export const usePantry = () => {
  const context = useContext(PantryContext);
  if (!context) throw new Error('usePantry must be used inside PantryProvider');
  return context;
};
