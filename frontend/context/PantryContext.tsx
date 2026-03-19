import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  fetchPantryItems as apiFetchPantryItems,
  createPantryItem as apiCreatePantryItem,
  updatePantryItem as apiUpdatePantryItem,
  deletePantryItem as apiDeletePantryItem,
  fetchPreferences,
  PantryItem,
  PantryItemInput,
} from '../services/api';
import { AuthContext } from './AuthenticationContext';
import {
  scheduleExpiryNotification,
  scheduleExpiryNotifications,
  cancelExpiryNotification,
  cancelAllExpiryNotifications,
  requestNotificationPermission,
} from '../utils/pantryNotifications';

type PantryContextType = {
  items: PantryItem[];
  loading: boolean;
  addItem: (item: PantryItemInput) => Promise<PantryItem>;
  addItems: (items: PantryItemInput[]) => Promise<PantryItem[]>;
  editItem: (id: string, updates: Partial<PantryItemInput>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  refreshItems: () => Promise<void>;
};

const PantryContext = createContext<PantryContextType | null>(null);

export const PantryProvider = ({ children }: { children: React.ReactNode }) => {
  const { loading: authLoading, token } = useContext(AuthContext);
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Notification prefs — loaded once when the user is authenticated
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [thresholdDays, setThresholdDays] = useState(7);

  // Load notification preferences from backend
  const loadNotifPrefs = useCallback(async () => {
    try {
      const prefs = await fetchPreferences();
      const enabled = prefs.expirationNotificationsEnabled ?? false;
      const threshold = prefs.expiringItemsThreshold ?? 7;
      setNotificationsEnabled(enabled);
      setThresholdDays(threshold);

      if (enabled) {
        await requestNotificationPermission();
      }
    } catch {
      // Fall back to defaults silently
    }
  }, []);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetchPantryItems();
      setItems(data ?? []);
      // Reschedule all notifications whenever items are reloaded
      const prefs = await fetchPreferences().catch(() => null);
      const enabled = prefs?.expirationNotificationsEnabled ?? false;
      const threshold = prefs?.expiringItemsThreshold ?? 7;
      if (enabled) {
        await scheduleExpiryNotifications(data ?? [], enabled, threshold);
      }
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
    loadNotifPrefs();
    loadItems();
  }, [authLoading, token, loadItems, loadNotifPrefs]);

  const addItem = async (item: PantryItemInput): Promise<PantryItem> => {
    const created = await apiCreatePantryItem(item);
    setItems((prev) => [...prev, created]);
    // Schedule notification for the new item
    await scheduleExpiryNotification(created, notificationsEnabled, thresholdDays);
    return created;
  };

  // Batch-add: creates all items in parallel and schedules notifications
  const addItems = async (newItems: PantryItemInput[]): Promise<PantryItem[]> => {
    const created = await Promise.all(newItems.map((item) => apiCreatePantryItem(item)));
    setItems((prev) => [...prev, ...created]);
    await scheduleExpiryNotifications(created, notificationsEnabled, thresholdDays);
    return created;
  };

  const editItem = async (id: string, updates: Partial<PantryItemInput>): Promise<void> => {
    const updated = await apiUpdatePantryItem(id, updates);
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    // Reschedule notification with updated expiration date
    await cancelExpiryNotification(id);
    await scheduleExpiryNotification(updated, notificationsEnabled, thresholdDays);
  };

  const removeItem = async (id: string): Promise<void> => {
    await apiDeletePantryItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    // Cancel notification for removed item
    await cancelExpiryNotification(id);
  };

  return (
    <PantryContext.Provider
      value={{ items, loading, addItem, addItems, editItem, removeItem, refreshItems: loadItems }}
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
