import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { File, Paths } from "expo-file-system";
import { exportMyData } from "../../../../services/api";

// expo-sharing is optional — the share sheet is the preferred path on native,
// but the feature still works on web (direct download) and on native by saving
// the file to the cache directory when the share module is unavailable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SharingModule = { isAvailableAsync: () => Promise<boolean>; shareAsync: (uri: string, opts?: any) => Promise<void> };
let sharingModule: SharingModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  sharingModule = require("expo-sharing") as SharingModule;
} catch {
  sharingModule = null;
}

export default function ExportData() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { filename, json } = await exportMyData();

      if (Platform.OS === "web") {
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Alert.alert("Export Ready", "Your data file has been downloaded.");
        return;
      }

      const file = new File(Paths.cache, filename);
      if (file.exists) {
        file.delete();
      }
      file.create();
      file.write(json);

      const canShare = sharingModule ? await sharingModule.isAvailableAsync().catch(() => false) : false;
      if (sharingModule && canShare) {
        await sharingModule.shareAsync(file.uri, {
          mimeType: "application/json",
          dialogTitle: "Save your BetrFood data",
          UTI: "public.json",
        });
      } else {
        Alert.alert(
          "Export Saved",
          `Your data was saved to:\n${file.uri}`
        );
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "Something went wrong while exporting your data.";
      Alert.alert("Export Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12} disabled={loading}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>Export My Data</Text>
        <View style={styles.headerSpacer} />
      </View> */}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.iconWrap}>
          <Ionicons name="download-outline" size={40} color="#22C55E" />
        </View>

        <Text style={styles.title}>Download a copy of your data</Text>
        <Text style={styles.body}>
          We&apos;ll package your profile, posts, recipes, comments, likes, pantry, collections, preferences and
          other account data into a single JSON file.
        </Text>
        <Text style={styles.body}>
          Photos and videos are referenced by their storage URL rather than embedded, so the file stays small.
        </Text>
        <Text style={styles.note}>
          This may take a few seconds. Please keep the screen open while we prepare your file.
        </Text>

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleExport}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.buttonInner}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.buttonText}>Preparing your export…</Text>
            </View>
          ) : (
            <View style={styles.buttonInner}>
              <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
              <Text style={styles.buttonText}>Request Export</Text>
            </View>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#F8FAFC",
  },
  backButton: {
    width: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  headerSpacer: {
    width: 32,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  iconWrap: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
    textAlign: "center",
    marginBottom: 12,
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 28,
  },
  button: {
    backgroundColor: "#22C55E",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
