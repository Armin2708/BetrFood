import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PantryItem } from '../services/api';
import { colors } from '../constants/theme';

interface PantryItemCardProps {
  item: PantryItem;
  onDelete: (id: string) => void;
}

function getExpirationStatus(expirationDate: string | null): {
  label: string;
  color: string;
} | null {
  if (!expirationDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expirationDate);
  exp.setHours(0, 0, 0, 0);
  const diffDays = Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: 'Expired', color: '#D32F2F' };
  if (diffDays === 0) return { label: 'Expires today', color: '#F57C00' };
  if (diffDays <= 3) return { label: `Expires in ${diffDays}d`, color: '#F57C00' };
  return {
    label: exp.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    color: colors.textTertiary,
  };
}

export default function PantryItemCard({ item, onDelete }: PantryItemCardProps) {
  const expStatus = getExpirationStatus(item.expirationDate);

  const handleDelete = () => {
    Alert.alert('Remove Item', `Remove "${item.name}" from your pantry?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  };

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${item.name}, ${item.quantity} ${item.unit}, category: ${item.category}`}
    >
      <View style={styles.left}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <View style={styles.metaRow}>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          <Text style={styles.quantity}>
            {item.quantity} {item.unit}
          </Text>
        </View>
        {expStatus && (
          <Text style={[styles.expiration, { color: expStatus.color }]}>
            {expStatus.label}
          </Text>
        )}
      </View>

      <TouchableOpacity
        onPress={handleDelete}
        style={styles.deleteButton}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.name}`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundPrimary,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  left: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 16,
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
    fontSize: 13,
    color: colors.textSecondary,
  },
  expiration: {
    fontSize: 12,
  },
  deleteButton: {
    paddingLeft: 12,
  },
});
