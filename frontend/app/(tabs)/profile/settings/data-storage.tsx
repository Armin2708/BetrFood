import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { resetRecommendations } from "../../../../services/api";
import {
  clearMediaCache,
  formatCacheSize,
  getMediaCacheSizeBytes,
} from "../../../../utils/mediaCache";

export default function DataStorageScreen() {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [cacheSizeBytes, setCacheSizeBytes] = useState<number | null>(null);
  const [calculatingCache, setCalculatingCache] = useState(true);
  const [cacheConfirmVisible, setCacheConfirmVisible] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

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

  useEffect(() => {
    refreshCacheSize();
  }, [refreshCacheSize]);

  const handleConfirmClearCache = async () => {
    setClearingCache(true);
    try {
      await clearMediaCache();
      setCacheSizeBytes(getMediaCacheSizeBytes());
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
      >
        <Text style={styles.sectionHeader}>CACHE</Text>
        <View style={styles.card}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>Image & Video Cache</Text>
            <Text style={styles.infoDescription}>
              Cached media that BetrFood has saved on this device to load faster. Clearing it
              frees up space; images and videos will re-download the next time you open them.
            </Text>
          </View>
          <View style={styles.cacheSizeRow}>
            <Text style={styles.cacheSizeLabel}>Currently using</Text>
            {calculatingCache ? (
              <ActivityIndicator size="small" color="#94A3B8" />
            ) : (
              <Text style={styles.cacheSizeValue}>{cacheSizeLabel}</Text>
            )}
          </View>
          <Pressable
            style={[styles.resetButton, (calculatingCache || clearingCache || cacheIsEmpty) && styles.resetButtonDisabled]}
            onPress={() => setCacheConfirmVisible(true)}
            disabled={calculatingCache || clearingCache || cacheIsEmpty}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={styles.resetButtonText}>Clear Cache</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionHeader}>RECOMMENDATIONS</Text>
        <View style={styles.card}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoTitle}>Reset Recommendations</Text>
            <Text style={styles.infoDescription}>
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
            <Text style={styles.resetButtonText}>Reset Recommendations</Text>
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
              <Text style={styles.modalCancelText}>Cancel</Text>
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
    fontSize: 12,
    fontWeight: "700",
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
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 6,
  },
  infoDescription: {
    fontSize: 13,
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
    fontWeight: "600",
    fontSize: 15,
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
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  cacheSizeValue: {
    fontSize: 15,
    fontWeight: "600",
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
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 10,
  },
  bulletList: {
    alignSelf: "center",
    marginBottom: 12,
  },
  bullet: {
    fontSize: 14,
    color: "#0F172A",
    lineHeight: 22,
  },
  modalFootnote: {
    fontSize: 12,
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
    fontWeight: "700",
    fontSize: 15,
  },
  modalCancelButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "500",
  },
});
