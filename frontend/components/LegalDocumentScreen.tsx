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

type LegalDocumentScreenProps = {
  type: LegalDocumentType;
};

export default function LegalDocumentScreen({ type }: LegalDocumentScreenProps) {
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Loading document...</Text>
      </View>
    );
  }

  if (!document) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Document unavailable</Text>
        <Text style={styles.errorText}>
          {error || 'This document could not be loaded. Please try again when you are back online.'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDocument}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#22C55E"
          colors={['#22C55E']}
        />
      }
    >
      <View style={styles.headerCard}>
        <Text style={styles.title}>{document.title}</Text>
        <Text style={styles.metaText}>Last updated: {document.lastUpdated}</Text>
        <Text style={styles.metaText}>Version: {document.version}</Text>
        {source !== 'remote' ? (
          <View style={styles.cacheBadge}>
            <Text style={styles.cacheBadgeText}>
              {source === 'cache' ? 'Showing cached version' : 'Showing bundled fallback'}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.documentCard}>
        <Markdown style={markdownStyles}>{document.content}</Markdown>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 15,
  },
  errorTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorText: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 18,
  },
  retryButton: {
    backgroundColor: '#22C55E',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  title: {
    color: '#0F172A',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 10,
  },
  metaText: {
    color: '#475569',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
});

const markdownStyles = {
  body: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 24,
  },
  heading1: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800' as const,
    marginTop: 8,
    marginBottom: 8,
  },
  heading2: {
    color: '#0F172A',
    fontSize: 19,
    fontWeight: '700' as const,
    marginTop: 18,
    marginBottom: 6,
  },
  heading3: {
    color: '#0F172A',
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
    color: '#334155',
  },
  strong: {
    color: '#0F172A',
    fontWeight: '700' as const,
  },
};
