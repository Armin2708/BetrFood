import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Recipe } from '../services/api';
import { DIFFICULTY_COLORS, ThemeColors } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';
import { useScaledTypography } from '../hooks/useScaledTypography';

interface RecipeDisplayProps {
  recipe: Recipe;
}

export default function RecipeDisplay({ recipe }: RecipeDisplayProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const scaledTypography = useScaledTypography();

  const difficultyLabel = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse recipe' : 'Expand recipe'}
        accessibilityState={{ expanded }}
      >
        <Text style={[styles.headerTitle, scaledTypography.label]}>Recipe</Text>
        <Text style={[styles.expandIcon, scaledTypography.title]}>{expanded ? '−' : '+'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {/* Meta info row */}
          <View style={styles.metaRow}>
            {recipe.cookTime != null && (
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, scaledTypography.small]}>Cook Time</Text>
                <Text style={[styles.metaValue, scaledTypography.label]}>{recipe.cookTime} min</Text>
              </View>
            )}
            {recipe.servings != null && (
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, scaledTypography.small]}>Servings</Text>
                <Text style={[styles.metaValue, scaledTypography.label]}>{recipe.servings}</Text>
              </View>
            )}
            {recipe.difficulty && (
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, scaledTypography.small]}>Difficulty</Text>
                <Text
                  style={[
                    styles.difficultyBadge,
                    scaledTypography.caption,
                    { backgroundColor: DIFFICULTY_COLORS[recipe.difficulty] },
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
              <Text style={[styles.sectionTitle, scaledTypography.label]}>Ingredients</Text>
              {recipe.ingredients.map((ing, index) => (
                <View key={ing.id || index} style={styles.ingredientRow}>
                  <Text style={[styles.bullet, scaledTypography.body]}>{'•'}</Text>
                  <Text style={[styles.ingredientText, scaledTypography.body]}>
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
              <Text style={[styles.sectionTitle, scaledTypography.label]}>Instructions</Text>
              {recipe.steps.map((step, index) => (
                <View key={step.id || index} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={[styles.stepNumberText, scaledTypography.small]}>{step.stepNumber}</Text>
                  </View>
                  <Text style={[styles.stepText, scaledTypography.body]}>{step.instruction}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      marginHorizontal: 10,
      marginTop: 8,
      marginBottom: 4,
      borderRadius: 10,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
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
      fontWeight: 'bold',
      color: colors.primary,
    },
    expandIcon: {
      fontWeight: 'bold',
      color: colors.primary,
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
      color: colors.textQuaternary,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    metaValue: {
      fontWeight: '600',
      color: colors.textPrimary,
    },
    difficultyBadge: {
      fontWeight: '600',
      color: colors.white,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      overflow: 'hidden',
    },
    section: {
      marginTop: 10,
    },
    sectionTitle: {
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    ingredientRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 3,
    },
    bullet: {
      color: colors.primary,
      marginRight: 8,
      lineHeight: 20,
    },
    ingredientText: {
      color: colors.textSecondary,
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
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
      marginTop: 1,
    },
    stepNumberText: {
      fontWeight: 'bold',
      color: colors.white,
    },
    stepText: {
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 20,
    },
  });
}
