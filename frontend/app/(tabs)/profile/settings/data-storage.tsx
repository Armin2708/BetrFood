import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppTheme } from "../../../../context/ThemeContext";
import { useScaledTypography } from "../../../../hooks/useScaledTypography";
import { clearAllConversations, resetRecommendations } from "../../../../services/api";

const RECENT_SEARCHES_KEY = "betrfood:recent_searches";

import {
  clearMediaCache,
  formatCacheSize,
  getMediaCacheSizeBytes,
} from "../../../../utils/mediaCache";
import {
  getStorageBreakdown,
  StorageBreakdown,
} from "../../../../utils/storageUsage";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function StorageBreakdownRow({
  icon,
  label,
  bytes,
  scaledTypography,
  colors,
}: {
  icon: IoniconName;
  label: string;
  bytes: number;
  scaledTypography: ReturnType<typeof useScaledTypography>;
  colors?: ReturnType<typeof useAppTheme>['colors'];
}) {
  return (
    <View style={styles.storageRow}>
      <View style={styles.storageIcon}>
        <Ionicons name={icon} size={18} color="#475569" />
      </View>
      <Text style={[scaledTypography.body, styles.storageLabel]}>{label}</Text>
      <Text style={[scaledTypography.small, styles.storageValue]}>{formatCacheSize(bytes)}</Text>
    </View>
  );
}

export default function DataStorageScreen() {
  const { colors } = useAppTheme();
  const scaledTypography = useScaledTypography();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [searchConfirmVisible, setSearchConfirmVisible] = useState(false);
  const [clearingSearch, setClearingSearch] = useState(false);

  const [chatConfirmVisible, setChatConfirmVisible] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);

  const [cacheSizeBytes, setCacheSizeBytes] = useState<number | null>(null);
  const [calculatingCache, setCalculatingCache] = useState(true);
  const [cacheConfirmVisible, setCacheConfirmVisible] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

  const [storage, setStorage] = useState<StorageBreakdown | null>(null);
  const [calculatingStorage, setCalculatingStorage] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refreshCacheSize = useCallback(async () => {
    setCalculatingCache(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      setCacheSizeBytes(getMediaCacheSizeBytes());
    } catch {
      setCacheSizeBytes(0);
    } finally {
      setCalculatingCache(false);
    }
  }, []);

  const refreshStorageBreakdown = useCallback(async () => {
    setCalculatingStorage(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      setStorage(getStorageBreakdown());
    } catch {
      setStorage({ cacheBytes: 0, downloadsBytes: 0, appDataBytes: 0, totalBytes: 0 });
    } finally {
      setCalculatingStorage(false);
    }
  }, []);

  useEffect(() => {
    refreshCacheSize();
    refreshStorageBreakdown();
  }, [refreshCacheSize, refreshStorageBreakdown]);

  const handlePullToRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshCacheSize(), refreshStorageBreakdown()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshCacheSize, refreshStorageBreakdown]);

  const handleConfirmClearCache = async () => {
    setClearingCache(true);
    try {
      await clearMediaCache();
      setCacheSizeBytes(getMediaCacheSizeBytes());
      await refreshStorageBreakdown();
      setCacheConfirmVisible(false);
      Alert.alert(
        "Cache cleared",
        "Images and videos will re-download as you browse."
      );
    } catch {
      setCacheConfirmVisible(false);
      Alert.alert("Something went wrong", "We couldn't clear the cache. Please try again.");
    } finally {
      setClearingCache(false);
    }
  };

  const cacheIsEmpty = cacheSizeBytes !== null && cacheSizeBytes === 0;
  const cacheSizeLabel =
    cacheSizeBytes === null ? "Calculating…" : formatCacheSize(cacheSizeBytes);

  const handleConfirmClearChatHistory = async () => {
    setClearingChat(true);
    try {
      await clearAllConversations();
      setChatConfirmVisible(false);
      Alert.alert("Chat history cleared", "All AI chat sessions have been deleted.");
    } catch {
      setChatConfirmVisible(false);
      Alert.alert("Something went wrong", "We couldn't clear your chat history. Please try again.");
    } finally {
      setClearingChat(false);
    }
  };

  const handleConfirmClearSearchHistory = async () => {
    setClearingSearch(true);
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
      setSearchConfirmVisible(false);
      Alert.alert("Search history cleared", "Your recent searches have been removed.");
    } catch {
      setSearchConfirmVisible(false);
      Alert.alert("Something went wrong", "We couldn't clear your search history. Please try again.");
    } finally {
      setClearingSearch(false);
    }
  };

  const handleConfirmReset = async () => {
    setResetting(true);
    try {
      const result = await resetRecommendations();
      setConfirmVisible(false);
      const { impressions, negativeFeedback, preferenceVector } = result.deleted;
      const total = impressions + negativeFeedback + preferenceVector;
      Alert.alert(
        "Recommendations reset",
        total === 0
          ? "Your recommendation signals were already clear. Pull to refresh For You to see non-personalized content."
          : `Cleared ${impressions} view record${impressions === 1 ? "" : "s"}, ${negativeFeedback} "not interested" entr${negativeFeedback === 1 ? "y" : "ies"}, and your learned preferences. Pull to refresh For You to see non-personalized content.`
      );
    } catch (err) {
      setConfirmVisible(false);
      const message = err instanceof Error ? err.message : "Please try again.";
      Alert.alert("Reset failed", message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullToRefresh}
            tintColor="#94A3B8"
          />
        }
      >
        <Text style={[styles.sectionHeader, scaledTypography.caption]}>STORAGE USAGE</Text>
        <View style={styles.card}>
          <View style={styles.infoBlock}>
            <Text style={[styles.infoTitle, scaledTypography.label]}>On this device</Text>
            <Text style={[styles.infoDescription, scaledTypography.small]}>
              How much space BetrFood is using on your phone. Pull down to recalculate.
            </Text>
          </View>

          {calculatingStorage && storage === null ? (
            <View style={styles.storageLoading}>
              <ActivityIndicator size="small" color="#94A3B8" />
            </View>
          ) : (
            <View style={styles.storageBreakdown}>
              <StorageBreakdownRow
                icon="image-outline"
                label="Cache"
                scaledTypography={scaledTypography}
                bytes={storage?.cacheBytes ?? 0}
              />
              <View style={styles.storageDivider} />
              <StorageBreakdownRow
                icon="cloud-download-outline"
                label="Downloads"
                scaledTypography={scaledTypography}
                bytes={storage?.downloadsBytes ?? 0}
              />
              <View style={styles.storageDivider} />
              <StorageBreakdownRow
                icon="folder-outline"
                label="App Data"
                scaledTypography={scaledTypography}
                bytes={storage?.appDataBytes ?? 0}
              />
              <View style={[styles.storageDivider, styles.storageTotalDivider]} />
              <View style={styles.storageRow}>
                <Text style={styles.storageTotalLabel}>Total</Text>
                <Text style={styles.storageTotalValue}>
                  {formatCacheSize(storage?.totalBytes ?? 0)}
                </Text>
              </View>
            </View>
          )}
        </View>

        <Text style={[styles.sectionHeader, scaledTypography.caption]}>CACHE</Text>
        <View style={styles.card}>
          <View style={styles.infoBlock}>
            <Text style={[styles.infoTitle, scaledTypography.label]}>Image & Video Cache</Text>
            <Text style={[styles.infoDescription, scaledTypography.small]}>
              Cached media that BetrFood has saved on this device to load faster. Clearing it
              frees up space; images and videos will re-download the next time you open them.
            </Text>
          </View>
          <View style={styles.cacheSizeRow}>
            <Text style={[styles.cacheSizeLabel, scaledTypography.small]}>Currently using</Text>
            {calculatingCache ? (
              <ActivityIndicator size="small" color="#94A3B8" />
            ) : (
              <Text style={[styles.cacheSizeValue, scaledTypography.body]}>{cacheSizeLabel}</Text>
            )}
          </View>
          <Pressable
            style={[styles.resetButton, (calculatingCache || clearingCache || cacheIsEmpty) && styles.resetButtonDisabled]}
            onPress={() => setCacheConfirmVisible(true)}
            disabled={calculatingCache || clearingCache || cacheIsEmpty}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={[styles.resetButtonText, scaledTypography.body]}>Clear Cache</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionHeader, scaledTypography.caption]}>SEARCH HISTORY</Text>
        <View style={styles.card}>
          <View style={styles.infoBlock}>
            <Text style={[styles.infoTitle, scaledTypography.label]}>Clear Search History</Text>
            <Text style={[styles.infoDescription, scaledTypography.small]}>
              Remove all recent searches saved on this device. This won't affect search suggestions shown to other users.
            </Text>
          </View>
          <Pressable
            style={styles.resetButton}
            onPress={() => setSearchConfirmVisible(true)}
          >
            <Ionicons name="search-outline" size={18} color="#EF4444" />
            <Text style={[styles.resetButtonText, scaledTypography.body]}>Clear Search History</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionHeader, scaledTypography.caption]}>AI CHAT HISTORY</Text>
        <View style={styles.card}>
          <View style={styles.infoBlock}>
            <Text style={[styles.infoTitle, scaledTypography.label]}>Clear AI Chat History</Text>
            <Text style={[styles.infoDescription, scaledTypography.small]}>
              Permanently delete all your AI chat sessions and messages. This cannot be undone.
            </Text>
          </View>
          <Pressable
            style={styles.resetButton}
            onPress={() => setChatConfirmVisible(true)}
          >
            <Ionicons name="chatbubbles-outline" size={18} color="#EF4444" />
            <Text style={[styles.resetButtonText, scaledTypography.body]}>Clear Chat History</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionHeader, scaledTypography.caption]}>RECOMMENDATIONS</Text>
        <View style={styles.card}>
          <View style={styles.infoBlock}>
            <Text style={[styles.infoTitle, scaledTypography.label]}>Reset Recommendations</Text>
            <Text style={[styles.infoDescription, scaledTypography.small]}>
              Clear everything the For You feed has learned about you. This removes your view
              history, "not interested" feedback, and learned preferences. The feed will go back
              to showing non-personalized content until you interact with new posts.
            </Text>
          </View>
          <Pressable
            style={styles.resetButton}
            onPress={() => setConfirmVisible(true)}
            disabled={resetting}
          >
            <Ionicons name="refresh-outline" size={18} color="#EF4444" />
            <Text style={[styles.resetButtonText, scaledTypography.body]}>Reset Recommendations</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !resetting && setConfirmVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !resetting && setConfirmVisible(false)}
        >
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalIconRow}>
              <Ionicons name="refresh-circle-outline" size={32} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Reset recommendations?</Text>
            <Text style={styles.modalMessage}>This will permanently clear:</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bullet}>{"•  Your view history"}</Text>
              <Text style={styles.bullet}>{"•  ‘Not interested’ feedback"}</Text>
              <Text style={styles.bullet}>{"•  Learned preferences"}</Text>
            </View>
            <Text style={styles.modalFootnote}>
              Your posts, likes, saves, and follows are not affected.
            </Text>
            <Pressable
              style={[styles.modalConfirmButton, resetting && { opacity: 0.6 }]}
              onPress={handleConfirmReset}
              disabled={resetting}
            >
              {resetting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalConfirmText}>Yes, Reset</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.modalCancelButton}
              onPress={() => setConfirmVisible(false)}
              disabled={resetting}
            >
              <Text style={[styles.modalCancelText, scaledTypography.body]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={searchConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !clearingSearch && setSearchConfirmVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !clearingSearch && setSearchConfirmVisible(false)}
        >
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalIconRow}>
              <Ionicons name="search-outline" size={28} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Clear search history?</Text>
            <Text style={styles.modalMessage}>
              All recent searches saved on this device will be removed.
            </Text>
            <Pressable
              style={[styles.modalConfirmButton, clearingSearch && { opacity: 0.6 }]}
              onPress={handleConfirmClearSearchHistory}
              disabled={clearingSearch}
            >
              {clearingSearch ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalConfirmText}>Clear History</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.modalCancelButton}
              onPress={() => setSearchConfirmVisible(false)}
              disabled={clearingSearch}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={chatConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !clearingChat && setChatConfirmVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !clearingChat && setChatConfirmVisible(false)}
        >
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalIconRow}>
              <Ionicons name="chatbubbles-outline" size={28} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Clear chat history?</Text>
            <Text style={styles.modalMessage}>
              All AI chat sessions and messages will be permanently deleted. This cannot be undone.
            </Text>
            <Pressable
              style={[styles.modalConfirmButton, clearingChat && { opacity: 0.6 }]}
              onPress={handleConfirmClearChatHistory}
              disabled={clearingChat}
            >
              {clearingChat ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalConfirmText}>Clear History</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.modalCancelButton}
              onPress={() => setChatConfirmVisible(false)}
              disabled={clearingChat}
            >
              <Text style={[styles.modalCancelText, scaledTypography.body]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={cacheConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !clearingCache && setCacheConfirmVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !clearingCache && setCacheConfirmVisible(false)}
        >
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalIconRow}>
              <Ionicons name="trash-outline" size={28} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Clear cached media?</Text>
            <Text style={styles.modalMessage}>
              This will remove {cacheSizeLabel} of cached images and videos. They'll re-download the next time you open them.
            </Text>
            <Pressable
              style={[styles.modalConfirmButton, clearingCache && { opacity: 0.6 }]}
              onPress={handleConfirmClearCache}
              disabled={clearingCache}
            >
              {clearingCache ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalConfirmText}>Clear Cache</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.modalCancelButton}
              onPress={() => setCacheConfirmVisible(false)}
              disabled={clearingCache}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    color: "#94A3B8",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
  },
  infoBlock: {
    marginBottom: 16,
  },
  infoTitle: {
    color: "#0F172A",
    marginBottom: 6,
  },
  infoDescription: {
    color: "#64748B",
    lineHeight: 19,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  resetButtonDisabled: {
    opacity: 0.5,
  },
  resetButtonText: {
    color: "#EF4444",
  },
  cacheSizeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    marginBottom: 12,
  },
  cacheSizeLabel: {
    color: "#64748B",
  },
  cacheSizeValue: {
    color: "#0F172A",
  },
  storageLoading: {
    paddingVertical: 24,
    alignItems: "center",
  },
  storageBreakdown: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 4,
  },
  storageRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  storageIcon: {
    width: 28,
    alignItems: "center",
  },
  storageLabel: {
    flex: 1,
    marginLeft: 8,
    color: "#0F172A",
  },
  storageValue: {
    color: "#475569",
  },
  storageDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 14,
  },
  storageTotalDivider: {
    marginHorizontal: 0,
    backgroundColor: "#CBD5E1",
  },
  storageTotalLabel: {
    flex: 1,
    color: "#0F172A",
  },
  storageTotalValue: {
    color: "#0F172A",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  modalIconRow: {
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 10,
  },
  modalMessage: {
    color: "#64748B",
    textAlign: "center",
    marginBottom: 10,
  },
  bulletList: {
    alignSelf: "center",
    marginBottom: 12,
  },
  bullet: {
    color: "#0F172A",
    lineHeight: 22,
  },
  modalFootnote: {
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 20,
  },
  modalConfirmButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  modalConfirmText: {
    color: "#fff",
  },
  modalCancelButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#64748B",
  },
});
