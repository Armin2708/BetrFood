import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usePantry } from '../../../context/PantryContext';
import PantryItemCard from '../../../components/PantryItemCard';
import ExpiringSoonSection from '../../../components/ExpiringSoonSection';
import { PantryItem, PantryItemInput } from '../../../services/api';
import { fetchPreferences } from '../../../services/api';
import { colors } from '../../../constants/theme';

const CATEGORIES = [
  'Produce', 'Dairy', 'Proteins', 'Grains',
  'Spices', 'Canned Goods', 'Frozen', 'Beverages', 'Snacks', 'Other',
];

const UNCATEGORIZED_LABEL = 'Uncategorized';

// ─── Add Item Modal ────────────────────────────────────────────────────────────

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
      <Pressable
        style={styles.modalOverlay}
        onPress={() => {
          reset();
          onClose();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
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
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─── Category Section Header ───────────────────────────────────────────────────

function CategoryHeader({
  category,
  count,
  collapsed,
  onToggle,
}: {
  category: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={onToggle}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${category}, ${count} item${count !== 1 ? 's' : ''}, ${collapsed ? 'collapsed' : 'expanded'}`}
      accessibilityState={{ expanded: !collapsed }}
    >
      <View style={styles.sectionHeaderLeft}>
        <Text style={styles.sectionHeaderText}>{category}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{count}</Text>
        </View>
      </View>
      <Ionicons
        name={collapsed ? 'chevron-forward' : 'chevron-down'}
        size={16}
        color={colors.textTertiary}
      />
    </TouchableOpacity>
  );
}

// ─── View Toggle ───────────────────────────────────────────────────────────────

function ViewToggle({
  grouped,
  onToggle,
}: {
  grouped: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.toggleBar}>
      <TouchableOpacity
        style={[styles.toggleButton, !grouped && styles.toggleButtonActive]}
        onPress={() => grouped && onToggle()}
        accessibilityRole="button"
        accessibilityLabel="Flat list view"
        accessibilityState={{ selected: !grouped }}
      >
        <Ionicons
          name="list-outline"
          size={16}
          color={!grouped ? colors.primary : colors.textTertiary}
        />
        <Text style={[styles.toggleLabel, !grouped && styles.toggleLabelActive]}>
          List
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.toggleButton, grouped && styles.toggleButtonActive]}
        onPress={() => !grouped && onToggle()}
        accessibilityRole="button"
        accessibilityLabel="Category grouped view"
        accessibilityState={{ selected: grouped }}
      >
        <Ionicons
          name="grid-outline"
          size={16}
          color={grouped ? colors.primary : colors.textTertiary}
        />
        <Text style={[styles.toggleLabel, grouped && styles.toggleLabelActive]}>
          By Category
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Pantry Screen ─────────────────────────────────────────────────────────────

export default function PantryScreen() {
  const { items, loading, addItem, removeItem, refreshItems } = usePantry();
  const [modalVisible, setModalVisible] = useState(false);
  const [groupedView, setGroupedView] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expiringItemsThreshold, setExpiringItemsThreshold] = useState(7);

  useFocusEffect(
    useCallback(() => {
      refreshItems();
      loadThreshold();
    }, [refreshItems])
  );

  const loadThreshold = async () => {
    try {
      const prefs = await fetchPreferences();
      setExpiringItemsThreshold(prefs.expiringItemsThreshold || 7);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const toggleCollapsed = (category: string) => {
    setCollapsed((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  // Navigate to the review screen with no pre-populated candidates (manual flow)
  const handleOpenReview = () => {
    router.push('/pantry-review');
  };

  // ── List row type ───────────────────────────────────────────────────────────

  type ListRow =
    | { type: 'header'; key: string; category: string; count: number }
    | { type: 'item'; key: string; item: PantryItem };

  // ── Flat list ───────────────────────────────────────────────────────────────

  const flatListData: ListRow[] = items
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => ({ type: 'item', key: item.id, item }));

  // ── Grouped list ────────────────────────────────────────────────────────────

  const grouped = items.reduce<Record<string, PantryItem[]>>((acc, item) => {
    const cat = item.category?.trim() || '';
    const label = CATEGORIES.includes(cat) ? cat : UNCATEGORIZED_LABEL;
    if (!acc[label]) acc[label] = [];
    acc[label].push(item);
    return acc;
  }, {});

  const orderedKeys = [
    ...CATEGORIES.filter((c) => (grouped[c]?.length ?? 0) > 0),
    ...(grouped[UNCATEGORIZED_LABEL]?.length > 0 ? [UNCATEGORIZED_LABEL] : []),
  ];

  const groupedListData: ListRow[] = orderedKeys.flatMap((category) => {
    const catItems = grouped[category] ?? [];
    const isCollapsed = !!collapsed[category];
    const headerRow: ListRow = {
      type: 'header',
      key: `header-${category}`,
      category,
      count: catItems.length,
    };
    if (isCollapsed) return [headerRow];
    return [
      headerRow,
      ...catItems
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item): ListRow => ({ type: 'item', key: item.id, item })),
    ];
  });

  const activeListData = groupedView ? groupedListData : flatListData;

  const renderRow = ({ item: row }: { item: ListRow }) => {
    if (row.type === 'header') {
      return (
        <CategoryHeader
          category={row.category}
          count={row.count}
          collapsed={!!collapsed[row.category]}
          onToggle={() => toggleCollapsed(row.category)}
        />
      );
    }
    return <PantryItemCard item={row.item} onDelete={removeItem} />;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">My Pantry</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={handleOpenReview}
            accessibilityRole="button"
            accessibilityLabel="Review and add multiple items"
          >
            <Ionicons name="clipboard-outline" size={18} color={colors.primary} />
            <Text style={styles.reviewButtonText}>Review</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addIconButton}
            onPress={() => setModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Add new pantry item"
          >
            <Ionicons name="add-circle" size={30} color={colors.primary} />
          </TouchableOpacity>
        </View>
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
        <>
          <ExpiringSoonSection items={items} threshold={expiringItemsThreshold} />
          <ViewToggle grouped={groupedView} onToggle={() => setGroupedView((v) => !v)} />
          <FlatList
            data={activeListData}
            keyExtractor={(row) => row.key}
            renderItem={renderRow}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onRefresh={refreshItems}
            refreshing={loading}
          />
        </>
      )}

      <AddItemModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={addItem}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  reviewButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
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
  toggleBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundPrimary,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  toggleButtonActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFF3EE',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  toggleLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 22,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
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
