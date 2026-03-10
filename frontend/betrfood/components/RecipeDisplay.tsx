import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Recipe } from '../services/api';

interface RecipeDisplayProps {
  recipe: Recipe;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy:   '#4CAF50',
  medium: '#FF9800',
  hard:   '#F44336',
};

export default function RecipeDisplay({ recipe }: RecipeDisplayProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.title}>Recipe</Text>
        <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <>
          {/* Meta row */}
          <View style={styles.metaRow}>
            {recipe.cookTime != null && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>⏱</Text>
                <Text style={styles.metaText}>{recipe.cookTime} min</Text>
              </View>
            )}
            {recipe.servings != null && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>🍽</Text>
                <Text style={styles.metaText}>{recipe.servings} servings</Text>
              </View>
            )}
            {recipe.difficulty && (
              <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_COLORS[recipe.difficulty] || '#999' }]}>
                <Text style={styles.difficultyText}>
                  {recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)}
                </Text>
              </View>
            )}
          </View>

          {/* Ingredients */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              {recipe.ingredients.map((ing) => (
                <View key={ing.id} style={styles.ingredientRow}>
                  <View style={styles.bullet} />
                  <Text style={styles.ingredientText}>
                    {[ing.quantity, ing.unit, ing.name].filter(Boolean).join(' ')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Steps */}
          {recipe.steps && recipe.steps.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Steps</Text>
              {recipe.steps.map((step) => (
                <View key={step.id} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{step.stepNumber}</Text>
                  </View>
                  <Text style={styles.stepText}>{step.instruction}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
  },
  chevron: {
    fontSize: 12,
    color: '#999',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 16,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: {
    fontSize: 14,
  },
  metaText: {
    fontSize: 14,
    color: '#555',
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B35',
    marginTop: 6,
  },
  ingredientText: {
    fontSize: 14,
    color: '#444',
    flex: 1,
    lineHeight: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  stepText: {
    fontSize: 14,
    color: '#444',
    flex: 1,
    lineHeight: 22,
  },
});
