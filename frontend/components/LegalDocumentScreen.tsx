import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import {
  fetchLegalDocument,
  LegalDocumentContent,
  LegalDocumentType,
} from '../services/legalDocuments';
import { useAppTheme } from '../context/ThemeContext';

type LegalDocumentScreenProps = {
  type: LegalDocumentType;
};

export default function LegalDocumentScreen({ type }: LegalDocumentScreenProps) {
  const { colors, isDark } = useAppTheme();
  const [document, setDocument] = useState<LegalDocumentContent | null>(null);
  const [source, setSource] = useState<'remote' | 'cache' | 'bundled'>('remote');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocument = useCallback(async () => {
    setError(null);

    try {
      const result = await fetchLegalDocument(type);
      setDocument(result.document);
      setSource(result.source);
    } catch (err: any) {
      setError(err?.message || 'Unable to load document right now.');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDocument();
    setRefreshing(false);
  }, [loadDocument]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundSecondary }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading document...</Text>
      </View>
    );
  }

  if (!document) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Document unavailable</Text>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          {error || 'This document could not be loaded. Please try again when you are back online.'}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={loadDocument}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={[styles.headerCard, { backgroundColor: colors.backgroundElevated }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{document.title}</Text>
        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
          Last updated: {document.lastUpdated}
        </Text>
        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
          Version: {document.version}
        </Text>
        {source !== 'remote' ? (
          <View
            style={[
              styles.cacheBadge,
              { backgroundColor: isDark ? '#3F2C12' : '#FEF3C7' },
            ]}
          >
            <Text
              style={[
                styles.cacheBadgeText,
                { color: isDark ? '#FCD34D' : '#92400E' },
              ]}
            >
              {source === 'cache' ? 'Showing cached version' : 'Showing bundled fallback'}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.documentCard, { backgroundColor: colors.backgroundElevated }]}>
        <Markdown style={getMarkdownStyles(colors)}>{document.content}</Markdown>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 18,
  },
  retryButton: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  headerCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 10,
  },
  metaText: {
    fontSize: 14,
    marginTop: 2,
  },
  cacheBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cacheBadgeText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '700',
  },
  documentCard: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
});

const getMarkdownStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => ({
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 24,
  },
  heading1: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800' as const,
    marginTop: 8,
    marginBottom: 8,
  },
  heading2: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '700' as const,
    marginTop: 18,
    marginBottom: 6,
  },
  heading3: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700' as const,
    marginTop: 14,
    marginBottom: 6,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 12,
  },
  bullet_list: {
    marginBottom: 12,
  },
  list_item: {
    color: colors.textSecondary,
  },
  strong: {
    color: colors.textPrimary,
    fontWeight: '700' as const,
  },
});
