import React, { useCallback, useState, useEffect, useMemo } from 'react';
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
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { usePantry } from '../../../context/PantryContext';
import PantryItemCard from '../../../components/PantryItemCard';
import ExpiringSoonSection from '../../../components/ExpiringSoonSection';
import { PantryItem, PantryItemInput, identifyPantryItems, identifySingleItem, scanReceipt } from '../../../services/api';
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
  const [scanning, setScanning] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);

  const reset = () => {
    setName('');
    setQuantity('');
    setUnit('');
    setCategory(CATEGORIES[0]);
    setExpirationDate('');
    setConfidence(null);
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

  const handleScanItem = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Camera access is needed to identify items.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]?.base64) return;

      setScanning(true);
      setConfidence(null);
      const identified = await identifySingleItem(result.assets[0].base64);

      if (!identified.name) {
        Alert.alert('Not Recognized', 'Could not identify a food item. Try a clearer photo.');
        return;
      }

      setName(identified.name);
      if (identified.category) setCategory(identified.category);
      setConfidence(identified.confidence);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to identify item.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable
        style={styles.modalOverlay}
        onPress={() => { reset(); onClose(); }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle} accessibilityRole="header">
              Add Pantry Item
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Item name *"
                value={name}
                onChangeText={(text) => { setName(text); setConfidence(null); }}
                accessibilityLabel="Item name"
              />
              <TouchableOpacity
                onPress={handleScanItem}
                disabled={scanning}
                accessibilityRole="button"
                accessibilityLabel="Identify item with camera"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {scanning ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="camera-outline" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>

            {confidence !== null && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 4,
              }}>
                <View style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 10,
                  backgroundColor: confidence >= 80 ? colors.primary : confidence >= 50 ? colors.warning : colors.error,
                }}>
                  <Text style={{ color: colors.white, fontSize: 12, fontWeight: '700' }}>
                    {confidence}%
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  {confidence >= 80 ? 'High confidence' : confidence >= 50 ? 'Medium confidence' : 'Low confidence — verify name'}
                </Text>
              </View>
            )}

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

// ─── Edit Item Modal ───────────────────────────────────────────────────────────

function EditItemModal({
  visible,
  item,
  onClose,
  onSave,
}: {
  visible: boolean;
  item: PantryItem | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<PantryItemInput>) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [expirationDate, setExpirationDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setQuantity(String(item.quantity));
      setUnit(item.unit);
      setCategory(CATEGORIES.includes(item.category) ? item.category : CATEGORIES[0]);
      setExpirationDate(item.expirationDate ?? '');
    }
  }, [item]);

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Required', 'Item name cannot be empty.');
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty < 0) return Alert.alert('Invalid', 'Please enter a valid quantity.');
    if (!unit.trim()) return Alert.alert('Required', 'Please enter a unit (e.g. cups, lbs, pcs).');

    if (expirationDate.trim()) {
      const d = new Date(expirationDate.trim());
      if (isNaN(d.getTime())) {
        return Alert.alert('Invalid Date', 'Enter expiration date as YYYY-MM-DD.');
      }
    }

    if (!item) return;
    setSaving(true);
    try {
      await onSave(item.id, {
        name: name.trim(),
        quantity: qty,
        unit: unit.trim(),
        category,
        expirationDate: expirationDate.trim() || null,
      });
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle} accessibilityRole="header">
              Edit Item
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Item name *"
              value={name}
              onChangeText={setName}
              accessibilityLabel="Item name"
              autoFocus
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
                placeholder="Unit *"
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
              onPress={handleSave}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Save changes"
            >
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.addButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel edit"
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

// ─── Search Bar ────────────────────────────────────────────────────────────────

function SearchBar({
  value,
  onChangeText,
  onClear,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
}) {
  return (
    <View style={styles.searchContainer}>
      <Ionicons name="search-outline" size={16} color={colors.textTertiary} style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder="Search by name or category..."
        placeholderTextColor={colors.placeholder}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        clearButtonMode="never"
        accessibilityLabel="Search pantry items"
        accessibilityRole="search"
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={onClear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Category Filter Chips ─────────────────────────────────────────────────────

function CategoryFilterChips({
  selected,
  onSelect,
  onClear,
  availableCategories,
}: {
  selected: string | null;
  onSelect: (cat: string) => void;
  onClear: () => void;
  availableCategories: string[];
}) {
  if (availableCategories.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterChipScroll}
    >
      {selected !== null && (
        <TouchableOpacity
          style={styles.clearFilterChip}
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="Clear category filter"
        >
          <Ionicons name="close" size={12} color={colors.textSecondary} />
          <Text style={styles.clearFilterChipText}>Clear</Text>
        </TouchableOpacity>
      )}
      {availableCategories.map((cat) => (
        <TouchableOpacity
          key={cat}
          style={[
            styles.filterChip,
            selected === cat && styles.filterChipSelected,
          ]}
          onPress={() => (selected === cat ? onClear() : onSelect(cat))}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === cat }}
          accessibilityLabel={`Filter by ${cat}`}
        >
          <Text
            style={[
              styles.filterChipText,
              selected === cat && styles.filterChipTextSelected,
            ]}
          >
            {cat}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Pantry Screen ─────────────────────────────────────────────────────────────

export default function PantryScreen() {
  const { items, loading, addItem, editItem, removeItem, refreshItems } = usePantry();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [groupedView, setGroupedView] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expiringItemsThreshold, setExpiringItemsThreshold] = useState(7);

  // ── Search & filter state ───────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [identifying, setIdentifying] = useState(false);
  const [scanningReceipt, setScanningReceipt] = useState(false);

  const hasActiveFilter = searchQuery.trim().length > 0 || selectedCategory !== null;

  const handlePhotoAdd = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Camera access is needed to photograph groceries.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]?.base64) return;

      setIdentifying(true);
      try {
        const items = await identifyPantryItems(result.assets[0].base64);

        if (items.length === 0) {
          Alert.alert('No Items Found', 'No grocery items were identified in the photo. Try a clearer photo.');
          return;
        }

        const candidates = items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          expirationDate: null,
        }));
        router.push({ pathname: '/pantry-review', params: { candidates: JSON.stringify(candidates) } });
      } finally {
        setIdentifying(false);
      }
    } catch (error: any) {
      setIdentifying(false);
      Alert.alert('Error', error.message || 'Failed to identify grocery items.');
    }
  };

  const handleScanReceipt = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Camera access is needed to scan receipts.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]?.base64) return;

      setScanningReceipt(true);
      try {
        const items = await scanReceipt(result.assets[0].base64);

        if (items.length === 0) {
          Alert.alert('No Items Found', 'Could not extract items from the receipt. Try a clearer photo with the items visible.');
          return;
        }

        const candidates = items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          expirationDate: null,
        }));
        router.push({ pathname: '/pantry-review', params: { candidates: JSON.stringify(candidates) } });
      } finally {
        setScanningReceipt(false);
      }
    } catch (error: any) {
      setScanningReceipt(false);
      Alert.alert('Error', error.message || 'Failed to scan receipt.');
    }
  };

  const handleClearAll = () => {
    setSearchQuery('');
    setSelectedCategory(null);
  };

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

  const handleOpenReview = () => {
    router.push('/pantry-review');
  };

  // ── Filtered items ──────────────────────────────────────────────────────────
  // Real-time filtering: matches name and category against the search query,
  // and optionally restricts to a selected category chip.
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        q.length === 0 ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      const matchesCategory =
        selectedCategory === null || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  // Only show categories that have at least one item (from full list, not filtered)
  const availableCategories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category?.trim() || UNCATEGORIZED_LABEL));
    return [...CATEGORIES.filter((c) => cats.has(c)),
      ...(cats.has(UNCATEGORIZED_LABEL) ? [UNCATEGORIZED_LABEL] : [])];
  }, [items]);

  // ── List row type ───────────────────────────────────────────────────────────

  type ListRow =
    | { type: 'header'; key: string; category: string; count: number }
    | { type: 'item'; key: string; item: PantryItem };

  // ── Flat list ───────────────────────────────────────────────────────────────

  const flatListData: ListRow[] = filteredItems
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => ({ type: 'item', key: item.id, item }));

  // ── Grouped list ────────────────────────────────────────────────────────────

  const grouped = filteredItems.reduce<Record<string, PantryItem[]>>((acc, item) => {
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
    return (
      <PantryItemCard
        item={row.item}
        onDelete={removeItem}
        onEdit={(item) => setEditingItem(item)}
      />
    );
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
            onPress={handleScanReceipt}
            disabled={identifying || scanningReceipt}
            accessibilityRole="button"
            accessibilityLabel="Scan receipt to add items"
            style={{ marginRight: 8 }}
          >
            <Ionicons name="document-text-outline" size={26} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePhotoAdd}
            disabled={identifying || scanningReceipt}
            accessibilityRole="button"
            accessibilityLabel="Add items by photo"
            style={{ marginRight: 8 }}
          >
            <Ionicons name="camera-outline" size={26} color={colors.primary} />
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

      {/* Search bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onClear={() => setSearchQuery('')}
      />

      {/* Category filter chips */}
      <CategoryFilterChips
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        onClear={() => setSelectedCategory(null)}
        availableCategories={availableCategories}
      />

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
          {/* Hide expiring section and view toggle when searching */}
          {!hasActiveFilter && (
            <ExpiringSoonSection items={items} threshold={expiringItemsThreshold} />
          )}
          {!hasActiveFilter && (
            <ViewToggle grouped={groupedView} onToggle={() => setGroupedView((v) => !v)} />
          )}
          <FlatList
            data={activeListData}
            keyExtractor={(row) => row.key}
            renderItem={renderRow}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onRefresh={refreshItems}
            refreshing={loading}
            ListEmptyComponent={
              <View style={styles.searchEmpty}>
                <Ionicons name="search-outline" size={40} color={colors.textTertiary} />
                <Text style={styles.searchEmptyTitle}>No items found</Text>
                <Text style={styles.searchEmptySubtitle}>
                  Try a different name or category.
                </Text>
                <TouchableOpacity
                  onPress={handleClearAll}
                  style={styles.clearAllButton}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search and filters"
                >
                  <Text style={styles.clearAllButtonText}>Clear Search</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </>
      )}

      <AddItemModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={addItem}
      />

      <EditItemModal
        visible={editingItem !== null}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={editItem}
      />

      {(identifying || scanningReceipt) && (
        <View style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
        }}>
          <View style={{
            backgroundColor: colors.white,
            borderRadius: 16,
            padding: 32,
            alignItems: 'center',
            gap: 16,
          }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>
              {scanningReceipt ? 'Scanning receipt...' : 'Identifying groceries...'}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>
              AI is analyzing your {scanningReceipt ? 'receipt' : 'photo'}
            </Text>
          </View>
        </View>
      )}
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
  // Search bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    padding: 0,
  },
  // Category filter chips
  filterChipScroll: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  clearFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  clearFilterChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundPrimary,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextSelected: {
    color: colors.white,
    fontWeight: '600',
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
  // Search empty state
  searchEmpty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 10,
  },
  searchEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  searchEmptySubtitle: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  clearAllButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  clearAllButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
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
