import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { PantryItem } from '../services/api';
import { colors } from '../constants/theme';

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
      <View style={styles.card}>
        <View style={styles.left}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
            <Text style={styles.quantity}>
              {item.quantity} {item.unit}
            </Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
          <Text style={styles.statusText}>{status.label}</Text>
        </View>
      </View>
    );
  };

  const expiredCount = expiringSoonItems.filter(
    (item) => getExpirationStatus(item.expirationDate)?.isExpired
  ).length;
  const expiringCount = expiringSoonItems.length - expiredCount;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Expiring Soon</Text>
        {expiredCount > 0 && (
          <View style={styles.expiredBadge}>
            <Text style={styles.expiredBadgeText}>{expiredCount} expired</Text>
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
    backgroundColor: '#ffa8d4',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  expiredBadge: {
    backgroundColor: '#D32F2F',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  expiredBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  list: {
    paddingHorizontal: 0,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffe0f0',
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  left: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryChip: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#F0F0F0',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  quantity: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },
});
