const express = require('express');
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/posts/:postId/recipe - get recipe for a post
router.get('/posts/:postId/recipe', async (req, res) => {
  try {
    const { postId } = req.params;

    const { data: recipe, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('post_id', postId)
      .single();

    if (error || !recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const fullRecipe = await buildRecipeResponse(recipe);
    res.json(fullRecipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Failed to fetch recipe.' });
  }
});

// POST /api/posts/:postId/recipe - create recipe (must be post owner)
router.post('/posts/:postId/recipe', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params;

    // Verify post exists and user is the owner
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, user_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (post.user_id !== req.userId) {
      return res.status(403).json({ error: 'You are not authorized to add a recipe to this post.' });
    }

    // Check if recipe already exists
    const { data: existing } = await supabase
      .from('recipes')
      .select('id')
      .eq('post_id', postId)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Recipe already exists for this post. Use PUT to update.' });
    }

    const { cookTime, servings, difficulty, ingredients, steps } = req.body;
    const now = new Date().toISOString();

    // Insert recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        post_id: postId,
        cook_time: cookTime || null,
        servings: servings || null,
        difficulty: difficulty || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (recipeError) throw recipeError;

    // Insert ingredients
    if (ingredients && ingredients.length > 0) {
      const ingredientRows = ingredients.map((ing, idx) => ({
        recipe_id: recipe.id,
        name: ing.name,
        quantity: ing.quantity || null,
        unit: ing.unit || null,
        order_index: idx,
      }));
      const { error: ingError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientRows);
      if (ingError) throw ingError;
    }

    // Insert steps
    if (steps && steps.length > 0) {
      const stepRows = steps.map((step, idx) => ({
        recipe_id: recipe.id,
        step_number: idx + 1,
        instruction: step.instruction,
      }));
      const { error: stepError } = await supabase
        .from('recipe_steps')
        .insert(stepRows);
      if (stepError) throw stepError;
    }

    const fullRecipe = await buildRecipeResponse(recipe);
    res.status(201).json(fullRecipe);
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Failed to create recipe.' });
  }
});

// PUT /api/posts/:postId/recipe - update recipe (must be post owner)
router.put('/posts/:postId/recipe', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params;

    // Verify post exists and user is the owner
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, user_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (post.user_id !== req.userId) {
      return res.status(403).json({ error: 'You are not authorized to update this recipe.' });
    }

    // Get existing recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .eq('post_id', postId)
      .single();

    if (recipeError || !recipe) {
      return res.status(404).json({ error: 'Recipe not found. Use POST to create.' });
    }

    const { cookTime, servings, difficulty, ingredients, steps } = req.body;
    const now = new Date().toISOString();

    // Update recipe fields
    const updates = { updated_at: now };
    if (cookTime !== undefined) updates.cook_time = cookTime;
    if (servings !== undefined) updates.servings = servings;
    if (difficulty !== undefined) updates.difficulty = difficulty;

    const { data: updated, error: updateError } = await supabase
      .from('recipes')
      .update(updates)
      .eq('id', recipe.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Replace ingredients if provided
    if (ingredients !== undefined) {
      // Delete existing
      const { error: delIngError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', recipe.id);
      if (delIngError) throw delIngError;

      // Insert new
      if (ingredients.length > 0) {
        const ingredientRows = ingredients.map((ing, idx) => ({
          recipe_id: recipe.id,
          name: ing.name,
          quantity: ing.quantity || null,
          unit: ing.unit || null,
          order_index: idx,
        }));
        const { error: ingError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientRows);
        if (ingError) throw ingError;
      }
    }

    // Replace steps if provided
    if (steps !== undefined) {
      // Delete existing
      const { error: delStepError } = await supabase
        .from('recipe_steps')
        .delete()
        .eq('recipe_id', recipe.id);
      if (delStepError) throw delStepError;

      // Insert new
      if (steps.length > 0) {
        const stepRows = steps.map((step, idx) => ({
          recipe_id: recipe.id,
          step_number: idx + 1,
          instruction: step.instruction,
        }));
        const { error: stepError } = await supabase
          .from('recipe_steps')
          .insert(stepRows);
        if (stepError) throw stepError;
      }
    }

    const fullRecipe = await buildRecipeResponse(updated);
    res.json(fullRecipe);
  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(500).json({ error: 'Failed to update recipe.' });
  }
});

// DELETE /api/posts/:postId/recipe - delete recipe (must be post owner)
router.delete('/posts/:postId/recipe', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params;

    // Verify post exists and user is the owner
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, user_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (post.user_id !== req.userId) {
      return res.status(403).json({ error: 'You are not authorized to delete this recipe.' });
    }

    // Delete recipe (cascades to ingredients and steps)
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('post_id', postId);

    if (error) throw error;
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Failed to delete recipe.' });
  }
});

// Helper: build full recipe response with ingredients and steps (camelCase)
async function buildRecipeResponse(recipe) {
  const [{ data: ingredients }, { data: steps }] = await Promise.all([
    supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', recipe.id)
      .order('order_index', { ascending: true }),
    supabase
      .from('recipe_steps')
      .select('*')
      .eq('recipe_id', recipe.id)
      .order('step_number', { ascending: true }),
  ]);

  return {
    id: recipe.id,
    postId: recipe.post_id,
    cookTime: recipe.cook_time,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    createdAt: recipe.created_at,
    updatedAt: recipe.updated_at,
    ingredients: (ingredients || []).map(ing => ({
      id: ing.id,
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      orderIndex: ing.order_index,
    })),
    steps: (steps || []).map(step => ({
      id: step.id,
      stepNumber: step.step_number,
      instruction: step.instruction,
    })),
  };
}

module.exports = router;
