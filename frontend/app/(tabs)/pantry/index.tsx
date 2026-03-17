import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { usePantry } from '../../../context/PantryContext';
import PantryItemCard from '../../../components/PantryItemCard';
import { PantryItem, PantryItemInput } from '../../../services/api';
import { colors } from '../../../constants/theme';

const CATEGORIES = [
  'Produce', 'Dairy', 'Meat', 'Grains',
  'Frozen', 'Canned', 'Beverages', 'Snacks', 'Spices', 'Other',
];

function AddItemModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: PantryItemInput) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [expirationDate, setExpirationDate] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setQuantity('');
    setUnit('');
    setCategory(CATEGORIES[0]);
    setExpirationDate('');
  };

  const handleAdd = async () => {
    if (!name.trim()) return Alert.alert('Required', 'Please enter an item name.');
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty < 0) return Alert.alert('Invalid', 'Please enter a valid quantity.');
    if (!unit.trim()) return Alert.alert('Required', 'Please enter a unit (e.g. cups, lbs, pcs).');

    if (expirationDate.trim()) {
      const d = new Date(expirationDate.trim());
      if (isNaN(d.getTime())) {
        return Alert.alert('Invalid Date', 'Enter expiration date as YYYY-MM-DD.');
      }
    }

    setSaving(true);
    try {
      await onAdd({
        name: name.trim(),
        quantity: qty,
        unit: unit.trim(),
        category,
        expirationDate: expirationDate.trim() || null,
      });
      reset();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle} accessibilityRole="header">
            Add Pantry Item
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Item name *"
            value={name}
            onChangeText={setName}
            accessibilityLabel="Item name"
          />

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="Qty *"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
              accessibilityLabel="Quantity"
            />
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="Unit * (e.g. cups)"
              value={unit}
              onChangeText={setUnit}
              accessibilityLabel="Unit"
            />
          </View>

          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, category === cat && styles.chipSelected]}
                onPress={() => setCategory(cat)}
                accessibilityRole="button"
                accessibilityState={{ selected: category === cat }}
                accessibilityLabel={cat}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextSelected]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Expiration date (YYYY-MM-DD, optional)"
            value={expirationDate}
            onChangeText={setExpirationDate}
            accessibilityLabel="Expiration date"
          />

          <TouchableOpacity
            style={[styles.addButton, saving && styles.addButtonDisabled]}
            onPress={handleAdd}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Add item to pantry"
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.addButtonText}>Add Item</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { reset(); onClose(); }}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function PantryScreen() {
  const { items, loading, addItem, removeItem, refreshItems } = usePantry();
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshItems();
    }, [refreshItems])
  );

  // Group by category, sort alphabetically
  const grouped = items.reduce<Record<string, PantryItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const sections = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  type ListRow =
    | { type: 'header'; key: string; category: string }
    | { type: 'item'; key: string; item: PantryItem };

  const listData: ListRow[] = sections.flatMap(([category, catItems]) => [
    { type: 'header', key: `header-${category}`, category },
    ...catItems.map((item) => ({ type: 'item' as const, key: item.id, item })),
  ]);

  const renderRow = ({ item: row }: { item: ListRow }) => {
    if (row.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{row.category}</Text>
        </View>
      );
    }
    return <PantryItemCard item={row.item} onDelete={removeItem} />;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">My Pantry</Text>
        <TouchableOpacity
          style={styles.addIconButton}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Add new pantry item"
        >
          <Ionicons name="add-circle" size={30} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="basket-outline" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>Your pantry is empty</Text>
          <Text style={styles.emptySubtitle}>
            Tap the + button to add your first ingredient or food item.
          </Text>
          <TouchableOpacity
            style={styles.emptyAddButton}
            onPress={() => setModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Add your first pantry item"
          >
            <Text style={styles.emptyAddButtonText}>Add First Item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(row) => row.key}
          renderItem={renderRow}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refreshItems}
          refreshing={loading}
        />
      )}

      <AddItemModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={addItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundPrimary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  addIconButton: {
    padding: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingBottom: 32,
  },
  sectionHeader: {
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyAddButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyAddButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.backgroundPrimary,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 10,
  },
  sheetTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  inputFlex: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  cancelText: {
    textAlign: 'center',
    color: colors.textTertiary,
    paddingBottom: 4,
  },
});
