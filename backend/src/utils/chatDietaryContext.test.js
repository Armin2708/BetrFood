const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeStringList,
  normalizeAllergies,
  buildDietaryProfileSection,
} = require('./chatDietaryContext');

test('normalizeStringList keeps only trimmed string values', () => {
  assert.deepEqual(
    normalizeStringList([' Vegan ', '', 'Keto', null, 42, '  Gluten-Free  ']),
    ['Vegan', 'Keto', 'Gluten-Free']
  );
});

test('normalizeAllergies supports both strings and legacy object entries', () => {
  assert.deepEqual(
    normalizeAllergies([
      ' Peanuts ',
      { name: 'Shellfish', severity: 'severe' },
      { name: ' Milk ' },
      {},
      null,
    ]),
    ['Peanuts', 'Shellfish', 'Milk']
  );
});

test('buildDietaryProfileSection includes profile data and strict safety instructions', () => {
  const section = buildDietaryProfileSection({
    dietaryPreferences: ['Vegetarian', 'Low-Carb'],
    allergies: ['Peanuts', { name: 'Sesame' }],
  });

  assert.match(section, /The user's dietary preferences: Vegetarian, Low-Carb\./);
  assert.match(section, /The user's allergies\/intolerances: Peanuts, Sesame\./);
  assert.match(section, /do not ask the user to repeat it/i);
  assert.match(section, /Never include or suggest any flagged allergens/i);
});

test('buildDietaryProfileSection falls back to none specified when no profile exists', () => {
  const section = buildDietaryProfileSection({
    dietaryPreferences: [],
    allergies: [],
  });

  assert.match(section, /The user's dietary preferences: None specified\./);
  assert.match(section, /The user's allergies\/intolerances: None specified\./);
});
