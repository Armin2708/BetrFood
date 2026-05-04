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
import { useAppTheme } from '../../../../context/ThemeContext';

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
  colors,
}: {
  item: LicenseEntry;
  expanded: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  return (
    <View style={[styles.rowCard, { backgroundColor: colors.backgroundElevated }]}>
      <Pressable style={styles.rowHeader} onPress={onToggle}>
        <View style={styles.rowCopy}>
          <Text style={[styles.libraryName, { color: colors.textPrimary }]}>{item.name}</Text>
          <Text style={[styles.libraryMeta, { color: colors.textSecondary }]}>
            v{item.version} • {item.licenseType}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textTertiary}
        />
      </Pressable>

      {expanded ? (
        <View
          style={[
            styles.expandedBody,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.backgroundSubtle,
            },
          ]}
        >
          <Text style={[styles.expandedLabel, { color: colors.textPrimary }]}>Full license text</Text>
          <Text style={[styles.licenseText, { color: colors.textSecondary }]}>{item.licenseText}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function OpenSourceLicensesScreen() {
  const { colors } = useAppTheme();
  const [expandedName, setExpandedName] = useState<string | null>(null);

  const libraries = useMemo(
    () => [...licenseData.libraries].sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  return (
    <FlatList
      style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}
      contentContainerStyle={styles.content}
      data={libraries}
      keyExtractor={(item) => item.name}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={[styles.headerCard, { backgroundColor: colors.backgroundElevated }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Open Source Licenses</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Third-party libraries used in the app, generated automatically from project dependencies.
          </Text>
          <Text style={[styles.detailText, { color: colors.textTertiary }]}>
            Libraries: {licenseData.libraryCount}
          </Text>
          <Text style={[styles.detailText, { color: colors.textTertiary }]}>
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
            colors={colors}
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
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 10,
  },
  detailText: {
    fontSize: 13,
    marginTop: 2,
  },
  rowCard: {
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
    fontSize: 16,
    fontWeight: '700',
  },
  libraryMeta: {
    fontSize: 13,
    marginTop: 4,
  },
  expandedBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  expandedLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  licenseText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
