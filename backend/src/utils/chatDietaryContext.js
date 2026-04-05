const DIETARY_SAFETY_INSTRUCTIONS = `
Always respect the user's dietary preferences and allergies automatically. Treat the stored dietary profile as authoritative for every response, and do not ask the user to repeat it unless they are explicitly changing it.

Never recommend ingredients, meals, substitutions, or garnishes that conflict with the user's stated dietary preferences. Never include or suggest any flagged allergens, even as optional add-ons, toppings, side dishes, or trace ingredients.

If a request conflicts with the user's dietary profile, explain the conflict clearly and offer safe alternatives instead. If you are unsure whether an ingredient is safe for the user's allergies, avoid recommending it and say that you are being cautious.`;

function normalizeStringList(values) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);
}

function normalizeAllergies(values) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => {
      if (typeof value === 'string') return value.trim();
      if (value && typeof value === 'object' && typeof value.name === 'string') {
        return value.name.trim();
      }
      return '';
    })
    .filter(Boolean);
}

function buildDietaryProfileSection({ dietaryPreferences = [], allergies = [] }) {
  const normalizedDietaryPreferences = normalizeStringList(dietaryPreferences);
  const normalizedAllergies = normalizeAllergies(allergies);

  return `
The user's dietary preferences: ${normalizedDietaryPreferences.length > 0 ? normalizedDietaryPreferences.join(', ') : 'None specified'}.
The user's allergies/intolerances: ${normalizedAllergies.length > 0 ? normalizedAllergies.join(', ') : 'None specified'}.
${DIETARY_SAFETY_INSTRUCTIONS}`;
}

module.exports = {
  DIETARY_SAFETY_INSTRUCTIONS,
  normalizeStringList,
  normalizeAllergies,
  buildDietaryProfileSection,
};
