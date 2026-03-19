/**
 * pantryMatcher.ts
 * Pure ingredient-matching logic — no React dependencies.
 * Compares a recipe's ingredient list against the user's pantry items.
 */

import { PantryItem } from '../services/api';

export interface MatchResult {
  /** Total ingredients in the recipe */
  total: number;
  /** Number of ingredients found in the pantry */
  matched: number;
  /** Number of ingredients NOT in the pantry */
  missing: number;
  /** Match ratio: matched / total (0–1) */
  ratio: number;
  /** True when ratio >= MATCH_THRESHOLD */
  isMatch: boolean;
  /** Names of the missing ingredients */
  missingNames: string[];
}

/** Minimum fraction of ingredients that must be in the pantry to count as a match */
export const MATCH_THRESHOLD = 0.8;

/**
 * Normalise an ingredient or pantry item name for fuzzy comparison.
 * Lowercases, strips punctuation, and trims common filler words so that
 * "2 cloves of Garlic" matches a pantry item called "garlic".
 */
function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')          // strip punctuation
    .replace(/\b(of|the|a|an)\b/g, '')   // strip filler words
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns true if `ingredientName` can be found inside any pantry item name,
 * or if any pantry item name is contained within `ingredientName`.
 * This handles cases like "cherry tomatoes" matching pantry item "tomatoes".
 */
function ingredientInPantry(
  ingredientName: string,
  pantryNames: string[]
): boolean {
  const normIngredient = normalise(ingredientName);
  return pantryNames.some((pantryName) => {
    const normPantry = normalise(pantryName);
    return (
      normIngredient.includes(normPantry) ||
      normPantry.includes(normIngredient)
    );
  });
}

/**
 * Match a recipe's ingredients against the user's pantry.
 * Returns a MatchResult with counts, ratio, and missing ingredient names.
 *
 * @param ingredientNames  Array of ingredient name strings from the recipe
 * @param pantryItems      The user's current pantry items
 */
export function matchRecipeToPantry(
  ingredientNames: string[],
  pantryItems: PantryItem[]
): MatchResult {
  const total = ingredientNames.length;

  if (total === 0) {
    return { total: 0, matched: 0, missing: 0, ratio: 0, isMatch: false, missingNames: [] };
  }

  const pantryNames = pantryItems.map((i) => i.name);
  const missingNames: string[] = [];
  let matched = 0;

  for (const name of ingredientNames) {
    if (ingredientInPantry(name, pantryNames)) {
      matched++;
    } else {
      missingNames.push(name);
    }
  }

  const missing = total - matched;
  const ratio = matched / total;
  const isMatch = ratio >= MATCH_THRESHOLD;

  return { total, matched, missing, ratio, isMatch, missingNames };
}
