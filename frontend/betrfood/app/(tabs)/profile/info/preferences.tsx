import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../../../context/AuthenticationContext';
import {
  fetchUserPreferences,
  updateUserPreferences,
} from '../../../../services/api';
import {
  CUISINES,
  SKILL_LEVELS,
  COOK_TIMES,
  EQUIPMENT,
  UserPreferences,
  DEFAULT_PREFERENCES,
} from '../../../../constants/preferenceData';

// TODO: replace with real user ID from AuthContext once backend auth is wired up
const CURRENT_USER_ID = 'current-user';

export default function PreferencesScreen() {
  const router = useRouter();
  const { user } = useContext(AuthContext);
  const userId = user?.id ?? CURRENT_USER_ID;

  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Load existing preferences ─────────────────────────────────────────────
  useEffect(() => {
    fetchUserPreferences(userId)
      .then((data) => setPrefs(data))
      .catch(() => setPrefs(DEFAULT_PREFERENCES))
      .finally(() => setLoading(false));
  }, [userId]);

  // ── Toggle helpers ────────────────────────────────────────────────────────
  const toggleCuisine = (id: string) => {
    setPrefs((prev) => ({
      ...prev,
      cuisines: prev.cuisines.includes(id)
        ? prev.cuisines.filter((c) => c !== id)
        : [...prev.cuisines, id],
    }));
  };

  const toggleEquipment = (id: string) => {
    setPrefs((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(id)
        ? prev.equipment.filter((e) => e !== id)
        : [...prev.equipment, id],
    }));
  };

  const setSkillLevel = (id: string) => {
    setPrefs((prev) => ({ ...prev, skillLevel: prev.skillLevel === id ? null : id }));
  };

  const setCookTime = (id: string) => {
    setPrefs((prev) => ({ ...prev, cookTime: prev.cookTime === id ? null : id }));
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserPreferences(userId, prefs);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Cooking Preferences', headerBackTitle: 'Back' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* ── Favourite Cuisines ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favourite Cuisines</Text>
          <Text style={styles.sectionSub}>Select all that apply</Text>
          <View style={styles.chipGrid}>
            {CUISINES.map((cuisine) => {
              const selected = prefs.cuisines.includes(cuisine.id);
              return (
                <TouchableOpacity
                  key={cuisine.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => toggleCuisine(cuisine.id)}
                >
                  <Text style={styles.chipEmoji}>{cuisine.emoji}</Text>
                  <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                    {cuisine.label}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Skill Level ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skill Level</Text>
          <Text style={styles.sectionSub}>Choose one</Text>
          {SKILL_LEVELS.map((level) => {
            const selected = prefs.skillLevel === level.id;
            return (
              <TouchableOpacity
                key={level.id}
                style={[styles.radioRow, selected && styles.radioRowSelected]}
                onPress={() => setSkillLevel(level.id)}
              >
                <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
                  {selected && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.radioLabel, selected && styles.radioLabelSelected]}>
                  {level.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Preferred Cook Time ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Cook Time</Text>
          <Text style={styles.sectionSub}>Choose one</Text>
          {COOK_TIMES.map((time) => {
            const selected = prefs.cookTime === time.id;
            return (
              <TouchableOpacity
                key={time.id}
                style={[styles.radioRow, selected && styles.radioRowSelected]}
                onPress={() => setCookTime(time.id)}
              >
                <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
                  {selected && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.radioLabel, selected && styles.radioLabelSelected]}>
                  {time.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Equipment ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kitchen Equipment</Text>
          <Text style={styles.sectionSub}>Select all that you have</Text>
          {EQUIPMENT.map((item) => {
            const selected = prefs.equipment.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.checkRow, selected && styles.checkRowSelected]}
                onPress={() => toggleEquipment(item.id)}
              >
                <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                  {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={[styles.checkLabel, selected && styles.checkLabelSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Save button */}
        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Save Preferences</Text>
          )}
        </Pressable>

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 13,
    color: '#999',
    marginBottom: 14,
  },
  // Cuisine chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  chipSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  chipEmoji: { fontSize: 15 },
  chipLabel: { fontSize: 13, fontWeight: '500', color: '#444' },
  chipLabelSelected: { color: '#fff' },
  // Radio rows (skill, cook time)
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 8,
    gap: 12,
  },
  radioRowSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#fff5f0',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: { borderColor: '#FF6B35' },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B35',
  },
  radioLabel: { fontSize: 14, color: '#444', flex: 1 },
  radioLabelSelected: { color: '#FF6B35', fontWeight: '600' },
  // Checkbox rows (equipment)
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 8,
    gap: 12,
  },
  checkRowSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#fff5f0',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  checkLabel: { fontSize: 14, color: '#444', flex: 1 },
  checkLabelSelected: { color: '#FF6B35', fontWeight: '600' },
  // Save
  saveButton: {
    margin: 20,
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
