// ---------------------------------------------------------------------------
// Configurable preference data — edit this file to add/remove options
// ---------------------------------------------------------------------------

export interface CuisineOption {
  id: string;
  label: string;
  emoji: string;
}

export interface PreferenceOption {
  id: string;
  label: string;
}

export const CUISINES: CuisineOption[] = [
  { id: 'italian',    label: 'Italian',     emoji: '🍝' },
  { id: 'mexican',    label: 'Mexican',     emoji: '🌮' },
  { id: 'japanese',   label: 'Japanese',    emoji: '🍱' },
  { id: 'chinese',    label: 'Chinese',     emoji: '🥟' },
  { id: 'indian',     label: 'Indian',      emoji: '🍛' },
  { id: 'french',     label: 'French',      emoji: '🥐' },
  { id: 'thai',       label: 'Thai',        emoji: '🍜' },
  { id: 'greek',      label: 'Greek',       emoji: '🫒' },
  { id: 'american',   label: 'American',    emoji: '🍔' },
  { id: 'korean',     label: 'Korean',      emoji: '🍲' },
  { id: 'vietnamese', label: 'Vietnamese',  emoji: '🍵' },
  { id: 'spanish',    label: 'Spanish',     emoji: '🥘' },
  { id: 'mediterranean', label: 'Mediterranean', emoji: '🫙' },
  { id: 'middle_eastern', label: 'Middle Eastern', emoji: '🧆' },
  { id: 'caribbean',  label: 'Caribbean',   emoji: '🌴' },
  { id: 'african',    label: 'African',     emoji: '🌍' },
];

export const SKILL_LEVELS: PreferenceOption[] = [
  { id: 'beginner',      label: 'Beginner — just learning the basics' },
  { id: 'intermediate',  label: 'Intermediate — comfortable in the kitchen' },
  { id: 'advanced',      label: 'Advanced — love a challenge' },
  { id: 'professional',  label: 'Professional — trained or experienced chef' },
];

export const COOK_TIMES: PreferenceOption[] = [
  { id: 'under_15',  label: 'Under 15 minutes' },
  { id: 'under_30',  label: 'Under 30 minutes' },
  { id: 'under_60',  label: 'Under 1 hour' },
  { id: 'any',       label: 'No preference' },
];

export const EQUIPMENT: PreferenceOption[] = [
  { id: 'stovetop',      label: 'Stovetop' },
  { id: 'oven',          label: 'Oven' },
  { id: 'air_fryer',     label: 'Air Fryer' },
  { id: 'instant_pot',   label: 'Instant Pot / Pressure Cooker' },
  { id: 'slow_cooker',   label: 'Slow Cooker' },
  { id: 'grill',         label: 'Grill / BBQ' },
  { id: 'wok',           label: 'Wok' },
  { id: 'blender',       label: 'Blender / Food Processor' },
  { id: 'stand_mixer',   label: 'Stand Mixer' },
  { id: 'no_cook',       label: 'No-cook / Raw' },
];

export interface UserPreferences {
  cuisines: string[];
  skillLevel: string | null;
  cookTime: string | null;
  equipment: string[];
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  cuisines: [],
  skillLevel: null,
  cookTime: null,
  equipment: [],
};
