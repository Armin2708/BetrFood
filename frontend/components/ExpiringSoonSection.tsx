import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { PantryItem } from '../services/api';
import { useScaledTypography } from '../hooks/useScaledTypography';
import { useAppTheme } from '../context/ThemeContext';

interface ExpiringSoonSectionProps {
  items: PantryItem[];
  threshold: number;
}

function getExpirationStatus(expirationDate: string | null): {
  label: string;
  color: string;
  isExpired: boolean;
  daysUntilExpiry: number;
} | null {
  if (!expirationDate) return null;

  const [year, month, day] = expirationDate.split('T')[0].split('-').map(Number);
  const exp = new Date(year, month - 1, day);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  
  const diffDays = Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: 'Expired', color: '#D32F2F', isExpired: true, daysUntilExpiry: diffDays };
  }
  if (diffDays === 0) {
    return { label: 'Expires today', color: '#F57C00', isExpired: false, daysUntilExpiry: 0 };
  }
  return {
    label: `Expires in ${diffDays}d`,
    color: '#F57C00',
    isExpired: false,
    daysUntilExpiry: diffDays,
  };
}

export default function ExpiringSoonSection({ items, threshold }: ExpiringSoonSectionProps) {
  const { colors } = useAppTheme();
  const scaledTypography = useScaledTypography();
  // Filter items that are expiring soon or already expired
  const expiringSoonItems = items
    .filter((item) => {
      const status = getExpirationStatus(item.expirationDate);
      if (!status) return false;
      return status.isExpired || status.daysUntilExpiry <= threshold;
    })
    .sort((a, b) => {
      const [aYear, aMonth, aDay] = (a.expirationDate || '').split('T')[0].split('-').map(Number);
      const [bYear, bMonth, bDay] = (b.expirationDate || '').split('T')[0].split('-').map(Number);
      const aExp = new Date(aYear, aMonth - 1, aDay);
      const bExp = new Date(bYear, bMonth - 1, bDay);
      return aExp.getTime() - bExp.getTime();
    });

  if (expiringSoonItems.length === 0) {
    return null;
  }

  const renderItem = ({ item }: { item: PantryItem }) => {
    const status = getExpirationStatus(item.expirationDate);
    if (!status) return null;

    return (
      <View style={[styles.card, { backgroundColor: colors.backgroundSubtle, borderColor: colors.borderLight }]}>
        <View style={styles.left}>
          <Text style={[styles.name, scaledTypography.label, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.categoryChip, { backgroundColor: colors.backgroundTertiary }]}>
              <Text style={[styles.categoryText, scaledTypography.small, { color: colors.textSecondary }]}>{item.category}</Text>
            </View>
            <Text style={[styles.quantity, scaledTypography.caption, { color: colors.textSecondary }]}>
              {item.quantity} {item.unit}
            </Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
          <Text style={[styles.statusText, scaledTypography.small]}>{status.label}</Text>
        </View>
      </View>
    );
  };

  const expiredCount = expiringSoonItems.filter(
    (item) => getExpirationStatus(item.expirationDate)?.isExpired
  ).length;
  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.headerText, scaledTypography.label, { color: colors.textPrimary }]}>Expiring Soon</Text>
        {expiredCount > 0 && (
          <View style={styles.expiredBadge}>
            <Text style={[styles.expiredBadgeText, scaledTypography.small]}>{expiredCount} expired</Text>
          </View>
        )}
      </View>

      <FlatList
        data={expiringSoonItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerText: {},
  expiredBadge: {
    backgroundColor: '#D32F2F',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  expiredBadgeText: {
    color: '#FFFFFF',
  },
  list: {
    paddingHorizontal: 0,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  left: {
    flex: 1,
    gap: 4,
  },
  name: {},
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryChip: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryText: {},
  quantity: {},
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 12,
  },
  statusText: {
    color: '#FFFFFF',
  },
});
