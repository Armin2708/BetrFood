import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Recipe } from '../services/api';

interface RecipeDisplayProps {
  recipe: Recipe;
}

export default function RecipeDisplay({ recipe }: RecipeDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  const difficultyLabel = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
  };

  const difficultyColor = {
    easy: '#4CAF50',
    medium: '#FF9800',
    hard: '#F44336',
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.headerTitle}>Recipe</Text>
        <Text style={styles.expandIcon}>{expanded ? '−' : '+'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {/* Meta info row */}
          <View style={styles.metaRow}>
            {recipe.cookTime != null && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Cook Time</Text>
                <Text style={styles.metaValue}>{recipe.cookTime} min</Text>
              </View>
            )}
            {recipe.servings != null && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Servings</Text>
                <Text style={styles.metaValue}>{recipe.servings}</Text>
              </View>
            )}
            {recipe.difficulty && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Difficulty</Text>
                <Text
                  style={[
                    styles.difficultyBadge,
                    { backgroundColor: difficultyColor[recipe.difficulty] },
                  ]}
                >
                  {difficultyLabel[recipe.difficulty]}
                </Text>
              </View>
            )}
          </View>

          {/* Ingredients */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              {recipe.ingredients.map((ing, index) => (
                <View key={ing.id || index} style={styles.ingredientRow}>
                  <Text style={styles.bullet}>{'\u2022'}</Text>
                  <Text style={styles.ingredientText}>
                    {ing.quantity ? `${ing.quantity} ` : ''}
                    {ing.unit ? `${ing.unit} ` : ''}
                    {ing.name}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Steps */}
          {recipe.steps && recipe.steps.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              {recipe.steps.map((step, index) => (
                <View key={step.id || index} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{step.stepNumber}</Text>
                  </View>
                  <Text style={styles.stepText}>{step.instruction}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 10,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 10,
    backgroundColor: '#FFF8F0',
    borderWidth: 1,
    borderColor: '#FFE0C2',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  expandIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  difficultyBadge: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 3,
  },
  bullet: {
    fontSize: 16,
    color: '#FF6B35',
    marginRight: 8,
    lineHeight: 20,
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
    marginBottom: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  stepText: {
    fontSize: 14,
    color: '#444',
    flex: 1,
    lineHeight: 20,
  },
});
