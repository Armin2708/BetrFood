import * as ImagePicker from 'expo-image-picker';
import { identifyPantryItems, type VisionPantryItem } from '../services/api/pantryVision';
import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePantry } from '../context/PantryContext';
import { AuthContext } from '../context/AuthenticationContext';
import { colors } from '../constants/theme';
import { PantryItemInput } from '../services/api';

const CATEGORIES = [
  'Produce', 'Dairy', 'Proteins', 'Grains',
  'Spices', 'Canned Goods', 'Frozen', 'Beverages', 'Snacks', 'Other',
];

type Candidate = {
  localId: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expirationDate: string | null;
};

function makeid() {
  return Math.random().toString(36).slice(2, 10);
}

function blankCandidate(): Candidate {
  return {
    localId: makeid(),
    name: '',
    quantity: 1,
    unit: 'pcs',
    category: CATEGORIES[0],
    expirationDate: null,
  };
}

// ─── Category Picker ───────────────────────────────────────────────────────────

function CategoryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (cat: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {CATEGORIES.map((cat) => (
        <TouchableOpacity
          key={cat}
          style={[styles.chip, value === cat && styles.chipSelected]}
          onPress={() => onChange(cat)}
          accessibilityRole="button"
          accessibilityState={{ selected: value === cat }}
          accessibilityLabel={cat}
        >
          <Text style={[styles.chipText, value === cat && styles.chipTextSelected]}>
            {cat}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Candidate Row ─────────────────────────────────────────────────────────────

function CandidateRow({
  candidate,
  onChange,
  onRemove,
}: {
  candidate: Candidate;
  onChange: (updated: Candidate) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const update = (fields: Partial<Candidate>) =>
    onChange({ ...candidate, ...fields });

  return (
    <View style={styles.candidateCard}>
      <View style={styles.candidateHeader}>
        <TextInput
          style={[styles.input, styles.nameInput]}
          value={candidate.name}
          onChangeText={(text) => update({ name: text })}
          placeholder="Item name *"
          accessibilityLabel="Item name"
        />
        <TouchableOpacity
          onPress={onRemove}
          style={styles.removeButton}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${candidate.name || 'item'}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={22} color={colors.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.inputFlex]}
          value={String(candidate.quantity)}
          onChangeText={(text) => {
            const n = parseFloat(text);
            update({ quantity: isNaN(n) ? 0 : n });
          }}
          placeholder="Qty"
          keyboardType="decimal-pad"
          accessibilityLabel="Quantity"
        />
        <TextInput
          style={[styles.input, styles.inputFlex]}
          value={candidate.unit}
          onChangeText={(text) => update({ unit: text })}
          placeholder="Unit"
          accessibilityLabel="Unit"
        />
      </View>

      <TouchableOpacity
        style={styles.categoryToggle}
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={`Category: ${candidate.category}. Tap to change.`}
      >
        <Text style={styles.categoryToggleText}>
          Category: <Text style={styles.categoryToggleValue}>{candidate.category}</Text>
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.textTertiary}
        />
      </TouchableOpacity>

      {expanded && (
        <CategoryPicker
          value={candidate.category}
          onChange={(cat) => {
            update({ category: cat });
            setExpanded(false);
          }}
        />
      )}
    </View>
  );
}

// ─── Review Screen ─────────────────────────────────────────────────────────────

export default function PantryReviewScreen() {
  const { addItems } = usePantry();
  const { token } = useContext(AuthContext);
  const params = useLocalSearchParams<{ candidates?: string }>();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    if (params.candidates) {
      try {
        const parsed: PantryItemInput[] = JSON.parse(params.candidates);
        return parsed.map((p) => ({
          localId: makeid(),
          name: p.name,
          quantity: p.quantity,
          unit: p.unit,
          category: p.category || CATEGORIES[0],
          expirationDate: p.expirationDate ?? null,
        }));
      } catch {
        // Fall through to empty list
      }
    }
    return [];
  });

  const [saving, setSaving] = useState(false);

  const updateCandidate = (localId: string, updated: Candidate) => {
    setCandidates((prev) =>
      prev.map((c) => (c.localId === localId ? updated : c))
    );
  };

  const removeCandidate = (localId: string) => {
    setCandidates((prev) => prev.filter((c) => c.localId !== localId));
  };

  const addBlankRow = () => {
    setCandidates((prev) => [...prev, blankCandidate()]);
  };

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: false,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
      setCandidates([]);
    }
  };

  const handleAnalyzePhoto = async () => {
    if (!photoUri) {
      Alert.alert('No photo selected', 'Pick a photo first.');
      return;
    }
    if (!token) {
      Alert.alert('Not signed in', 'You need to be signed in to analyze a photo.');
      return;
    }

    setAnalyzing(true);
    try {
      const result = await identifyPantryItems(token, photoUri);
      const mapped: Candidate[] = result.items.map((item) => ({
        localId: makeid(),
        name: item.name,
        quantity: typeof item.quantity === 'number' ? item.quantity : 1,
        unit: item.unit || 'pcs',
        category: item.category || CATEGORIES[0],
        expirationDate: null,
      }));
      setCandidates(mapped);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to analyze photo.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    const invalid = candidates.filter((c) => !c.name.trim());
    if (invalid.length > 0) {
      return Alert.alert(
        'Missing Names',
        'Every item needs a name. Remove or fill in the highlighted rows.'
      );
    }
    if (candidates.length === 0) {
      return Alert.alert('Nothing to add', 'Add at least one item before confirming.');
    }

    setSaving(true);
    try {
      const inputs: PantryItemInput[] = candidates.map((c) => ({
        name: c.name.trim(),
        quantity: c.quantity,
        unit: c.unit.trim() || 'pcs',
        category: c.category,
        expirationDate: c.expirationDate,
      }));
      await addItems(inputs);
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add items to pantry.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    Alert.alert('Discard Items', 'Are you sure you want to discard all items?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  // ── Photo section rendered as FlatList header so it scrolls with the list
  // and never gets pushed off screen or covered by the list expanding to fill space.
  const ListHeader = (
    <>
      <Text style={styles.subtitle}>
        Review, edit, or remove items before adding them to your pantry.
      </Text>

      <View style={styles.photoSection}>
        <TouchableOpacity
          style={styles.photoButton}
          onPress={handlePickPhoto}
          accessibilityRole="button"
          accessibilityLabel="Pick a grocery photo"
        >
          <Ionicons name="image-outline" size={18} color={colors.white} />
          <Text style={styles.photoButtonText}>
            {photoUri ? 'Choose Different Photo' : 'Pick Grocery Photo'}
          </Text>
        </TouchableOpacity>

        {photoUri && (
          <>
            <View style={styles.photoPreviewWrapper}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            </View>

            <TouchableOpacity
              style={[styles.analyzeButton, analyzing && styles.analyzeButtonDisabled]}
              onPress={handleAnalyzePhoto}
              disabled={analyzing}
              accessibilityRole="button"
              accessibilityLabel="Analyze photo for multiple grocery items"
            >
              {analyzing ? (
                <>
                  <ActivityIndicator size="small" color={colors.white} />
                  <Text style={styles.analyzeButtonText}>Analyzing…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="scan-outline" size={18} color={colors.white} />
                  <Text style={styles.analyzeButtonText}>Analyze Photo</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {candidates.length > 0 && (
        <Text style={styles.itemsLabel}>
          {candidates.length} item{candidates.length !== 1 ? 's' : ''} identified — review and edit below
        </Text>
      )}
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Fixed header with Discard / title / Add N Items */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleDiscard}
          accessibilityRole="button"
          accessibilityLabel="Discard and go back"
          style={styles.headerButton}
        >
          <Text style={styles.headerButtonText}>Discard</Text>
        </TouchableOpacity>

        <Text style={styles.title} accessibilityRole="header">
          Review Items
        </Text>

        <TouchableOpacity
          onPress={handleConfirm}
          disabled={saving || candidates.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Confirm and add all items to pantry"
          style={[
            styles.confirmButton,
            (saving || candidates.length === 0) && styles.confirmButtonDisabled,
          ]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.confirmButtonText}>
              Add {candidates.length} {candidates.length === 1 ? 'Item' : 'Items'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* FlatList owns the rest of the screen — photo section is its header */}
      <FlatList
        data={candidates}
        keyExtractor={(c) => c.localId}
        renderItem={({ item }) => (
          <CandidateRow
            candidate={item}
            onChange={(updated) => updateCandidate(item.localId, updated)}
            onRemove={() => removeCandidate(item.localId)}
          />
        )}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="basket-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>No items yet.</Text>
            <Text style={styles.emptySubText}>
              Pick a photo and tap Analyze, or add items manually below.
            </Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addRowButton}
            onPress={addBlankRow}
            accessibilityRole="button"
            accessibilityLabel="Add another item manually"
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.addRowButtonText}>Add Item</Text>
          </TouchableOpacity>
        }
      />
    </KeyboardAvoidingView>
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
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerButton: {
    minWidth: 64,
  },
  headerButtonText: {
    fontSize: 15,
    color: colors.textTertiary,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 64,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.backgroundSubtle,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  list: {
    paddingBottom: 40,
  },
  itemsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  candidateCard: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  candidateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameInput: {
    flex: 1,
    fontWeight: '600',
  },
  removeButton: {
    padding: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 9,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundPrimary,
  },
  inputFlex: {
    flex: 1,
  },
  categoryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  categoryToggleText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  categoryToggleValue: {
    color: colors.primary,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  addRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addRowButtonText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptySubText: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  photoSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 10,
  },
  photoButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  photoPreviewWrapper: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSubtle,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  analyzeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  analyzeButtonDisabled: {
    opacity: 0.7,
  },
  analyzeButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
