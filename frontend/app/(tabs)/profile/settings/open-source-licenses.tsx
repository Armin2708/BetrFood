import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import licenseData from '../../../../assets/data/open-source-licenses.json';

type LicenseEntry = {
  name: string;
  version: string;
  licenseType: string;
  licenseText: string;
};

function LicenseRow({
  item,
  expanded,
  onToggle,
}: {
  item: LicenseEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.rowCard}>
      <Pressable style={styles.rowHeader} onPress={onToggle}>
        <View style={styles.rowCopy}>
          <Text style={styles.libraryName}>{item.name}</Text>
          <Text style={styles.libraryMeta}>
            v{item.version} • {item.licenseType}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#64748B"
        />
      </Pressable>

      {expanded ? (
        <View style={styles.expandedBody}>
          <Text style={styles.expandedLabel}>Full license text</Text>
          <Text style={styles.licenseText}>{item.licenseText}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function OpenSourceLicensesScreen() {
  const [expandedName, setExpandedName] = useState<string | null>(null);

  const libraries = useMemo(
    () => [...licenseData.libraries].sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={libraries}
      keyExtractor={(item) => item.name}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={styles.headerCard}>
          <Text style={styles.title}>Open Source Licenses</Text>
          <Text style={styles.subtitle}>
            Third-party libraries used in the app, generated automatically from project dependencies.
          </Text>
          <Text style={styles.detailText}>Libraries: {licenseData.libraryCount}</Text>
          <Text style={styles.detailText}>
            Generated: {new Date(licenseData.generatedAt).toLocaleDateString()}
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const expanded = expandedName === item.name;
        return (
          <LicenseRow
            item={item}
            expanded={expanded}
            onToggle={() => setExpandedName(expanded ? null : item.name)}
          />
        );
      }}
    />
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
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  title: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 10,
  },
  detailText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 2,
  },
  rowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 10,
    overflow: 'hidden',
  },
  rowHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowCopy: {
    flex: 1,
  },
  libraryName: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  libraryMeta: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 4,
  },
  expandedBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FCFCFD',
  },
  expandedLabel: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  licenseText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 20,
  },
});
