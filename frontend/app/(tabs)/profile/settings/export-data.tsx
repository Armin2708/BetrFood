import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';
import { useAppTheme } from '../../../../context/ThemeContext';
import { useScaledTypography } from '../../../../hooks/useScaledTypography';
import { requestDataExport, DataExportResult } from '../../../../services/api';
import { ThemeColors } from '../../../../constants/theme';

const INCLUDED_DATA = [
  'Profile and preferences',
  'Posts and recipes',
  'Pantry items',
  'Collections',
  'Likes and comments',
  'Followers and following',
];

export default function ExportDataScreen() {
  const { colors } = useAppTheme();
  const scaledTypography = useScaledTypography();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<DataExportResult | null>(null);
  const [countdown, setCountdown] = useState('');

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
      Alert.alert('Export Failed', err.message || 'Failed to generate export. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result?.downloadUrl) return;
    setDownloading(true);
    try {
      const filename = `betrfood-export-${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = result.downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // Native: try downloading to cache and sharing via system sheet.
      // Supabase signed URLs can redirect, so we fall back to opening in
      // the system browser if FileSystem.downloadAsync fails.
      let downloaded = false;
      try {
        const fileUri = (FileSystem.cacheDirectory ?? '') + filename;
        const dl = await FileSystem.downloadAsync(result.downloadUrl, fileUri);
        if (dl.status === 200 && (await Sharing.isAvailableAsync())) {
          await Sharing.shareAsync(dl.uri, {
            mimeType: 'application/json',
            dialogTitle: 'Save your BetrFood data export',
            UTI: 'public.json',
          });
          downloaded = true;
        }
      } catch {
        // fall through to browser fallback
      }

      if (!downloaded) {
        await Linking.openURL(result.downloadUrl);
      }
    } catch {
      Alert.alert('Download Failed', 'Could not open the export. The link has been sent to your email as well.');
    } finally {
      setDownloading(false);
    }
  };

  const isExpired = countdown === 'Expired';

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info card */}
        <View style={[styles.card, { backgroundColor: colors.backgroundElevated }]}>
          <View style={styles.iconRow}>
            <Ionicons name="shield-checkmark-outline" size={28} color="#22C55E" />
          </View>
          <Text style={[styles.cardTitle, scaledTypography.subtitle, { color: colors.textPrimary }]}>
            Your data, your rights
          </Text>
          <Text style={[styles.cardBody, scaledTypography.body, { color: colors.textSecondary }]}>
            In accordance with GDPR, you can download a copy of all your personal data stored on
            BetrFood. Your export includes:
          </Text>
          <View style={styles.dataList}>
            {INCLUDED_DATA.map((item) => (
              <View key={item} style={styles.dataListRow}>
                <Ionicons name="checkmark" size={14} color="#22C55E" style={styles.checkIcon} />
                <Text style={[scaledTypography.body, { color: colors.textSecondary }]}>{item}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.footnote, scaledTypography.small, { color: colors.textTertiary }]}>
            Export is provided as a JSON file. A download link will also be sent to your email address. The link expires after 24 hours.
          </Text>
        </View>

        {/* Result card — shown after successful export */}
        {result && (
          <>
            <Text style={[styles.sectionHeader, scaledTypography.caption, { color: colors.textTertiary }]}>
              YOUR EXPORT
            </Text>
            <View style={[styles.resultCard, { backgroundColor: colors.backgroundElevated }]}>
              <View style={styles.resultRow}>
                <Ionicons name="checkmark-circle" size={20} color="#22C55E" style={styles.resultIcon} />
                <Text style={[scaledTypography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
                  Export ready
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.resultRow}>
                <Ionicons name="mail-outline" size={18} color={colors.textTertiary} style={styles.resultIcon} />
                <Text style={[scaledTypography.small, { color: colors.textSecondary, flex: 1 }]}>
                  Download link sent to your email
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
              <View style={styles.resultRow}>
                <Text style={[scaledTypography.body, { color: colors.textSecondary, flex: 1 }]}>
                  Link expires in
                </Text>
                <Text
                  style={[
                    scaledTypography.body,
                    { color: isExpired ? '#EF4444' : '#22C55E', fontVariant: ['tabular-nums'] },
                  ]}
                >
                  {countdown}
                </Text>
              </View>
            </View>

            <Pressable
              style={[styles.downloadButton, (downloading || isExpired) && styles.buttonDisabled]}
              onPress={handleDownload}
              disabled={downloading || isExpired}
            >
              {downloading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" style={styles.buttonIcon} />
                  <Text style={[styles.downloadButtonText, scaledTypography.body]}>Downloading…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={[styles.downloadButtonText, scaledTypography.body]}>
                    {isExpired ? 'Link Expired' : 'Download My Data'}
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={handleRequestExport} disabled={loading}>
              <Text style={[scaledTypography.body, { color: colors.textSecondary }]}>
                Generate new export
              </Text>
            </Pressable>
          </>
        )}

        {/* Request button — shown before export */}
        {!result && (
          <Pressable
            style={[styles.requestButton, loading && styles.buttonDisabled]}
            onPress={handleRequestExport}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator size="small" color="#fff" style={styles.buttonIcon} />
                <Text style={[styles.requestButtonText, scaledTypography.body]}>
                  Generating your export…
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-download-outline" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={[styles.requestButtonText, scaledTypography.body]}>Export My Data</Text>
              </>
            )}
          </Pressable>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
    card: {
      borderRadius: 18,
      padding: 20,
      marginBottom: 8,
    },
    iconRow: { alignItems: 'center', marginBottom: 12 },
    cardTitle: { textAlign: 'center', marginBottom: 10 },
    cardBody: { lineHeight: 20, marginBottom: 14 },
    dataList: { marginBottom: 14 },
    dataListRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    checkIcon: { marginRight: 8 },
    footnote: { lineHeight: 18 },
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
    resultIcon: { marginRight: 10 },
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
    secondaryButton: {
      alignItems: 'center',
      paddingVertical: 12,
      marginTop: 8,
    },
    requestButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#22C55E',
      borderRadius: 14,
      paddingVertical: 16,
      marginTop: 16,
    },
    requestButtonText: { color: '#fff' },
    buttonDisabled: { opacity: 0.5 },
    buttonIcon: { marginRight: 8 },
  });
}
