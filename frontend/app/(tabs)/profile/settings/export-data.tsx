import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../../context/ThemeContext';
import { useScaledTypography } from '../../../../hooks/useScaledTypography';
import { requestDataExport, DataExportResult } from '../../../../services/api';

export default function ExportDataScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const scaledTypography = useScaledTypography();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DataExportResult | null>(null);
  const [countdown, setCountdown] = useState('');

  // Countdown timer — updates every second while result is present
  useEffect(() => {
    if (!result?.expiresAt) return;
    const expiresAt = new Date(result.expiresAt).getTime();

    const tick = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        setCountdown('Expired');
        return;
      }
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setCountdown(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [result?.expiresAt]);

  const handleRequestExport = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await requestDataExport();
      setResult(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to generate export. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result?.downloadUrl) return;
    try {
      const response = await fetch(result.downloadUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `betrfood-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      Alert.alert('Error', 'Failed to download export file.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.backgroundSecondary }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.backgroundSecondary }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, scaledTypography.title, { color: colors.textPrimary }]}>Export My Data</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: colors.backgroundElevated }]}>
          <View style={styles.infoIconRow}>
            <Ionicons name="shield-checkmark-outline" size={28} color="#22C55E" />
          </View>
          <Text style={[styles.infoTitle, scaledTypography.subtitle, { color: colors.textPrimary }]}>Your data, your rights</Text>
          <Text style={[styles.infoBody, scaledTypography.body, { color: colors.textSecondary }]}>
            In accordance with GDPR, you can download a copy of all your personal data stored on BetrFood. Your export includes:
          </Text>
          <View style={styles.dataList}>
            {[
              'Profile and preferences',
              'Posts and recipes',
              'Pantry items',
              'Collections',
              'Likes and comments',
              'Followers and following',
            ].map(item => (
              <View key={item} style={styles.dataListRow}>
                <Ionicons name="checkmark" size={14} color="#22C55E" style={{ marginRight: 8 }} />
                <Text style={[styles.dataListItem, scaledTypography.body, { color: colors.textSecondary }]}>{item}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.infoFootnote, scaledTypography.small, { color: colors.textTertiary }]}>
            Export is provided as a JSON file. The download link expires after 24 hours.
          </Text>
        </View>

        {/* Result card — shown after successful export */}
        {result && (
          <>
            <Text style={[styles.sectionHeader, scaledTypography.caption, { color: colors.textTertiary }]}>YOUR EXPORT</Text>
            <View style={[styles.resultCard, { backgroundColor: colors.backgroundElevated }]}>
              <View style={styles.resultRow}>
                <Ionicons name="checkmark-circle" size={20} color="#22C55E" style={{ marginRight: 10 }} />
                <Text style={[styles.resultText, scaledTypography.body, { color: colors.textPrimary }]}>Export ready</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.resultRow}>
                <Text style={[styles.resultLabel, scaledTypography.body, { color: colors.textSecondary }]}>Link expires in</Text>
                <Text style={[styles.resultValue, scaledTypography.body, { color: countdown === 'Expired' ? '#EF4444' : '#22C55E', fontVariant: ['tabular-nums'] }]}>
                  {countdown}
                </Text>
              </View>
            </View>

            <Pressable style={styles.downloadButton} onPress={handleDownload}>
              <Ionicons name="download-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={[styles.downloadButtonText, scaledTypography.body]}>Download My Data</Text>
            </Pressable>

            <Pressable style={styles.newExportButton} onPress={handleRequestExport} disabled={loading}>
              <Text style={[styles.newExportText, scaledTypography.body, { color: colors.textSecondary }]}>Generate new export</Text>
            </Pressable>
          </>
        )}

        {/* Request button — shown before export */}
        {!result && (
          <Pressable
            style={[styles.requestButton, loading && styles.requestButtonDisabled]}
            onPress={handleRequestExport}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                <Text style={[styles.requestButtonText, scaledTypography.body]}>Generating your export…</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-download-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={[styles.requestButtonText, scaledTypography.body]}>Export My Data</Text>
              </>
            )}
          </Pressable>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backButton: { width: 32 },
  headerTitle: { },
  headerSpacer: { width: 32 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  infoCard: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 8,
  },
  infoIconRow: { alignItems: 'center', marginBottom: 12 },
  infoTitle: { textAlign: 'center', marginBottom: 10 },
  infoBody: { lineHeight: 20, marginBottom: 14 },
  dataList: { marginBottom: 14 },
  dataListRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dataListItem: { },
  infoFootnote: { lineHeight: 18 },
  sectionHeader: {
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  resultCard: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  resultText: { fontWeight: '600' },
  resultLabel: { flex: 1 },
  resultValue: { fontWeight: '500' },
  divider: { height: 1, marginLeft: 16 },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 16,
  },
  downloadButtonText: { color: '#fff' },
  newExportButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  newExportText: { },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 16,
  },
  requestButtonDisabled: { backgroundColor: '#86EFAC' },
  requestButtonText: { color: '#fff' },
});
