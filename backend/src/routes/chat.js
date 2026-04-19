const express = require('express');
const OpenAI = require('openai');
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');
const {
  normalizeStringList,
  normalizeAllergies,
  buildDietaryProfileSection,
} = require('../utils/chatDietaryContext');

const router = express.Router();

const openai = process.env.OPENROUTER_API_KEY
  ? new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    })
  : null;

const CHAT_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';

const BASE_SYSTEM_PROMPT =
  "You are BetrFood's AI cooking assistant. You help users with food-related questions including recipes, cooking techniques, ingredient substitutions, meal planning, nutrition information, and food storage tips. Be friendly, concise, and helpful. If asked about non-food topics, gently redirect to food-related assistance.";

const RECIPE_FORMAT_INSTRUCTIONS = `
When suggesting recipes, always format each recipe as follows:

**[Recipe Name]**
[1-2 sentence description]
- **Pantry items used:** [comma-separated list]
- **Extra items needed:** [comma-separated list, or "None" if pantry covers it]

Suggest 2-3 recipes per response unless the user asks for more or fewer. After listing recipes, offer to give detailed instructions for any of them.`;

const PANTRY_INTENT_KEYWORDS = [
  'pantry', 'what can i cook', 'what can i make', 'ingredients i have',
  'what do i have', 'use up', 'fridge', 'use what', 'leftovers',
  'cook with', 'make with', 'recipe with', 'recipe from', 'meal idea',
  'meal suggestion', 'dinner idea', 'lunch idea', 'breakfast idea',
];

const POST_SUGGESTION_KEYWORDS = [
  'show me', 'find me', 'suggest a post', 'suggest posts', 'betrfood posts',
  'posts about', 'recipes on betrfood', 'find a recipe', 'search for',
  'any posts', 'any recipes', 'pasta recipe', 'chicken recipe', 'vegan recipe',
  'show me recipes', 'find recipes', 'look up', 'browse',
];

function hasPantryIntent(message) {
  const lower = message.toLowerCase();
  return PANTRY_INTENT_KEYWORDS.some((kw) => lower.includes(kw));
}

function hasPostSuggestionIntent(message) {
  const lower = message.toLowerCase();
  return POST_SUGGESTION_KEYWORDS.some((kw) => lower.includes(kw));
}

// Extract search keywords from a message for post search
function extractSearchKeywords(message) {
  // Strip common filler words and extract meaningful terms
  const stopWords = new Set(['show', 'me', 'find', 'a', 'the', 'some', 'any', 'posts', 'about',
    'recipes', 'for', 'with', 'on', 'betrfood', 'suggest', 'get', 'look', 'up', 'search',
    'please', 'can', 'you', 'i', 'want', 'need', 'like', 'give', 'have', 'that', 'require',
    'requires', 'made', 'from', 'containing', 'has', 'use', 'uses', 'contain', 'contains',
    'or', 'and', 'which', 'what', 'will', 'would', 'do', 'does', 'is', 'are', 'be']);
  return message.toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .split(' ')
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 5);
}

// Search posts by keyword matching caption and tags
async function searchPosts(keywords, limit = 3) {
  if (!keywords.length) return [];
  try {
    const allMatches = new Set();
    
    // Try each keyword
    for (const keyword of keywords) {
      const normalized = keyword.toLowerCase();

      // Try multiple search variations to handle plurals
      const searchVariations = [
        `%${normalized}%`,
        `%${normalized.slice(0, -1)}%`, // Remove 's' for plural handling
      ];

      let found = false;

      for (const pattern of searchVariations) {
        const { data: captionResults } = await supabase
          .from('posts')
          .select('id, caption, image_path, user_id, media_type')
          .ilike('caption', pattern)
          .limit(limit * 2);
        if (captionResults?.length) {
          captionResults.forEach(p => allMatches.add(JSON.stringify(p)));
          found = true;
          break;
        }
      }

      // Search ingredients
      if (!found) {
        for (const pattern of searchVariations) {
          const { data: ingredients } = await supabase
            .from('recipe_ingredients')
            .select('recipe_id, id')
            .ilike('name', pattern)
            .limit(limit * 5);
          
          if (ingredients?.length) {
            const recipeIds = ingredients.map(i => i.recipe_id);
            
            // Get posts that have these recipes
            const { data: recipePosts } = await supabase
              .from('recipes')
              .select('post_id')
              .in('id', recipeIds);
            
            const postIds = recipePosts?.map(r => r.post_id) || [];
            if (postIds.length > 0) {
              const { data: ingredientPostData } = await supabase
                .from('posts')
                .select('id, caption, image_path, user_id, media_type')
                .in('id', postIds)
                .limit(limit * 2);
              ingredientPostData?.forEach(p => allMatches.add(JSON.stringify(p)));
              found = true;
            }
            break;
          }
        }
      }
    }
    
    // Deduplicate and convert back from JSON strings
    const posts = Array.from(allMatches).map(p => JSON.parse(p)).slice(0, limit);

    // Also search by tags
    const { data: taggedPosts } = await supabase
      .from('tags')
      .select('id, name, post_tags(post_id)')
      .or(keywords.map(k => `name.ilike.%${k}%`).join(','));

    const taggedPostIds = new Set();
    (taggedPosts || []).forEach(tag => {
      (tag.post_tags || []).forEach(pt => taggedPostIds.add(pt.post_id));
    });

    let tagMatches = [];
    if (taggedPostIds.size > 0) {
      const { data } = await supabase
        .from('posts')
        .select('id, caption, image_path, user_id, media_type')
        .in('id', [...taggedPostIds])
        .limit(limit);
      tagMatches = data || [];
    }

    const seen = new Set();
    const merged = [...(posts || []), ...tagMatches].filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    }).slice(0, limit);

    console.log('[SEARCH POSTS] total merged:', merged.length);

    // Fetch usernames
    const userIds = [...new Set(merged.map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name, username')
      .in('id', userIds);

    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    // Fetch recipe data for each post
    const postIds = merged.map(p => p.id);
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, post_id, cook_time, servings, difficulty')
      .in('post_id', postIds);

    const recipeMap = {};
    (recipes || []).forEach(r => { recipeMap[r.post_id] = r; });

    // Fetch ingredients for found recipes
    const recipeIds = (recipes || []).map(r => r.id);
    let ingredientMap = {};
    let stepsMap = {};
    if (recipeIds.length > 0) {
      const { data: ingredients } = await supabase
        .from('recipe_ingredients')
        .select('recipe_id, name, quantity, unit')
        .in('recipe_id', recipeIds)
        .order('order_index', { ascending: true });

      (ingredients || []).forEach(ing => {
        if (!ingredientMap[ing.recipe_id]) ingredientMap[ing.recipe_id] = [];
        ingredientMap[ing.recipe_id].push(ing);
      });
      
      // Fetch recipe steps
      const { data: steps } = await supabase
        .from('recipe_steps')
        .select('recipe_id, step_number, instruction')
        .in('recipe_id', recipeIds)
        .order('step_number', { ascending: true });

      (steps || []).forEach(step => {
        if (!stepsMap[step.recipe_id]) stepsMap[step.recipe_id] = [];
        stepsMap[step.recipe_id].push(step);
      });
    }

    return merged.map(p => {
      const recipe = recipeMap[p.id];
      const ingredients = recipe ? (ingredientMap[recipe.id] || []) : [];
      const steps = recipe ? (stepsMap[recipe.id] || []) : [];
      return {
        id: p.id,
        caption: p.caption || '',
        imagePath: p.image_path || null,
        username: profileMap[p.user_id]?.display_name || profileMap[p.user_id]?.username || 'Unknown',
        mediaType: p.media_type || 'image',
        cookTime: recipe?.cook_time || null,
        servings: recipe?.servings || null,
        ingredients: ingredients.map(i => ({
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
        })),
        steps: steps.map(s => ({
          stepNumber: s.step_number,
          instruction: s.instruction,
        })),
      };
    });
  } catch (err) {
    console.error('[SEARCH POSTS ERROR]', err.message);
    return [];
  }
}

function formatPostForPrompt(p) {
  let text = `Post: "${p.caption || 'Untitled'}" by ${p.username}`;
  if (p.cookTime) text += `\nCook time: ${p.cookTime}`;
  if (p.ingredients?.length) {
    text += `\nIngredients: ${p.ingredients.map(i => `${[i.quantity, i.unit, i.name].filter(Boolean).join(' ')}`).join(', ')}`;
  }
  if (p.steps?.length) {
    text += `\nThis recipe has ${p.steps.length} cooking step(s):`;
    p.steps.forEach((step) => {
      text += `\n  • Step ${step.stepNumber}: ${step.instruction}`;
    });
  } else {
    text += `\nThis recipe has no specific cooking instructions provided.`;
  }
  return text;
}

/**
 * Formats a PostContext recipe into system prompt injection text
 * @param {Object} recipe - Recipe object from PostContext
 * @returns {string} Formatted recipe section for system prompt
 */
function formatRecipeForSystemPrompt(recipe) {
  if (!recipe) return '';
  
  const r = recipe;
  let section = '\nThis post includes a recipe:';
  if (r.cookTime) section += `\n- Cook time: ${r.cookTime}`;
  if (r.servings) section += `\n- Servings: ${r.servings}`;
  if (r.difficulty) section += `\n- Difficulty: ${r.difficulty}`;
  if (r.ingredients?.length) section += `\n- Ingredients: ${r.ingredients.join(', ')}`;
  if (r.steps?.length) section += `\n- Steps: ${r.steps.map((s, i) => `${i + 1}. ${s}`).join(' ')}`;
  
  return section;
}

async function fetchUserDietaryContext(userId) {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('dietary_preferences, allergies')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[CHAT] Preferences query failed:', error.message);
      return {
        dietaryPreferences: [],
        allergies: [],
      };
    }

    const dietaryPreferences = normalizeStringList(data?.dietary_preferences);
    const allergies = normalizeAllergies(data?.allergies);

    return { dietaryPreferences, allergies };
  } catch (err) {
    console.error('[CHAT] fetchUserDietaryContext error:', err.message);
    return {
      dietaryPreferences: [],
      allergies: [],
    };
  }
}

async function buildSystemPrompt(userId, isPantryQuery = false, isPostSuggestionQuery = false, hasPostResults = false) {
  // For post suggestion queries, skip pantry context entirely
  if (isPostSuggestionQuery) {
    const { dietaryPreferences, allergies } = await fetchUserDietaryContext(userId);
    const dietarySection = buildDietaryProfileSection({ dietaryPreferences, allergies });

    if (hasPostResults) {
      return `${BASE_SYSTEM_PROMPT}\n\nThe user is asking to find posts on BetrFood. You will be provided with a list of matching posts. Describe each one briefly and explain why it's relevant to the user's query. Encourage them to tap the post cards below to view the full recipes.${dietarySection}`;
    } else {
      return `${BASE_SYSTEM_PROMPT}\n\nThe user is asking to find posts on BetrFood but no matching posts were found in the database. Let the user know you couldn't find any matching posts, and offer general recipe suggestions or advice instead. Do NOT make up or fabricate post titles.${dietarySection}`;
    }
  }
  try {
    const { dietaryPreferences, allergies } = await fetchUserDietaryContext(userId);
    const { data: pantryItems, error: pantryError } = await supabase
      .from('pantry_items')
      .select('name, quantity, unit, category, expiration_date')
      .eq('user_id', userId);

    if (pantryError) {
      console.error('[CHAT] Pantry query failed:', pantryError.message);
    }

    const dietarySection = buildDietaryProfileSection({ dietaryPreferences, allergies });

    if (!pantryItems || pantryItems.length === 0) {
      return `${BASE_SYSTEM_PROMPT}${dietarySection}\n\nThe user's pantry is currently empty. If they ask about cooking or recipes, let them know their pantry is empty and suggest they add items to their pantry first. You can still answer general food questions.${isPantryQuery ? RECIPE_FORMAT_INSTRUCTIONS : ''}`;
    }

    const now = new Date();
    const itemList = pantryItems
      .map((item) => {
        let entry = `- ${item.name}: ${item.quantity} ${item.unit}`.trimEnd();
        if (item.category) entry += ` (${item.category})`;
        if (item.expiration_date) {
          const exp = new Date(item.expiration_date);
          if (exp < now) {
            entry += ' [EXPIRED]';
          } else {
            const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 3) entry += ` [expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}]`;
          }
        }
        return entry;
      })
      .join('\n');

    const pantrySection = `
The user's pantry currently contains these items:
${itemList}

When suggesting recipes or meal ideas, prioritize using ingredients from the user's pantry. Clearly flag any ingredients a recipe needs that are NOT in the pantry as "Extra items needed." Note items expiring soon and suggest using them first.`;

    if (isPantryQuery) {
      return `${BASE_SYSTEM_PROMPT}${dietarySection}${pantrySection}${RECIPE_FORMAT_INSTRUCTIONS}`;
    }

    return `${BASE_SYSTEM_PROMPT}${dietarySection}${pantrySection}`;
  } catch (err) {
    console.error('[CHAT] buildSystemPrompt error:', err.message);
    return BASE_SYSTEM_PROMPT;
  }
}

function getUserId(req) {
  return req.userId || (req.user && req.user.id) || req.headers['x-user-id'] || 'anonymous';
}

// Truncate a message to use as a fallback title
function truncateTitle(message) {
  const trimmed = message.trim().substring(0, 60);
  return trimmed.length < message.trim().length ? trimmed + '...' : trimmed;
}

// Generate a short 3-5 word AI title, fire-and-forget safe (returns null on failure)
async function generateAiTitle(message) {
  if (!openai) return null;
  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_tokens: 15,
      messages: [
        {
          role: 'system',
          content: 'Generate a short 3-5 word title summarizing this message. Return ONLY the title — no quotes, no punctuation, no extra text.',
        },
        { role: 'user', content: message.trim().substring(0, 200) },
      ],
    });
    const title = response.choices[0].message.content?.trim();
    return title && title.length > 0 && title.length <= 80 ? title : null;
  } catch {
    return null;
  }
}

function sanitizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .filter((attachment) => attachment && attachment.type === 'image' && typeof attachment.dataUrl === 'string')
    .slice(0, 1)
    .map((attachment) => ({
      type: 'image',
      dataUrl: attachment.dataUrl,
      mimeType: attachment.mimeType || 'image/jpeg',
    }));
}

function buildUserMessageContent(message, attachments = []) {
  if (!attachments.length) {
    return message.trim();
  }

  const text = message.trim() || 'Please help with this food image.';

  return [
    { type: 'text', text },
    ...attachments.map((attachment) => ({
      type: 'image_url',
      image_url: { url: attachment.dataUrl },
    })),
  ];
}

async function syncConversationMetadata(conversationId, message, existingMessageCount = 0) {
  const nextUpdatedAt = new Date().toISOString();
  const preview = message.trim().substring(0, 120);

  if (!existingMessageCount || existingMessageCount <= 1) {
    // Set a fast truncated title immediately so the conversation is never untitled
    await supabase
      .from('chat_conversations')
      .update({ title: truncateTitle(message), last_message_preview: preview, updated_at: nextUpdatedAt })
      .eq('id', conversationId);

    // Upgrade to an AI-generated title asynchronously — doesn't block the response
    generateAiTitle(message).then((aiTitle) => {
      if (aiTitle) {
        supabase
          .from('chat_conversations')
          .update({ title: aiTitle })
          .eq('id', conversationId)
          .then(() => {})
          .catch(() => {});
      }
    }).catch(() => {});
    return;
  }

  await supabase
    .from('chat_conversations')
    .update({ last_message_preview: preview, updated_at: nextUpdatedAt })
    .eq('id', conversationId);
}

// Map a raw chat_message DB row to the API response shape (snake_case → camelCase)
function formatChatMessage(m) {
  const { suggested_posts, ...rest } = m;
  return {
    ...rest,
    suggestedPosts: suggested_posts?.length ? suggested_posts : undefined,
  };
}

// GET /api/chat/conversations — list all conversations
router.get('/conversations', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('id, title, last_message_preview, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json({ conversations: data || [] });
  } catch (err) {
    console.error('[CONVERSATIONS ERROR]', err.message);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// POST /api/chat/conversations — create a new conversation
router.post('/conversations', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({ user_id: userId, title: 'New Chat' })
      .select('id, title, created_at, updated_at')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[CREATE CONVERSATION ERROR]', err.message);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// PATCH /api/chat/conversations/:id — rename a conversation
router.patch('/conversations/:id', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { title } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }

  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .update({ title: title.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, title, last_message_preview, created_at, updated_at')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[RENAME CONVERSATION ERROR]', err.message);
    res.status(500).json({ error: 'Failed to rename conversation' });
  }
});

// DELETE /api/chat/conversations — delete ALL conversations for a user
router.delete('/conversations', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  try {
    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ message: 'All conversations deleted' });
  } catch (err) {
    console.error('[CLEAR ALL CONVERSATIONS ERROR]', err.message);
    res.status(500).json({ error: 'Failed to clear all conversations' });
  }
});

// DELETE /api/chat/conversations/:id — delete a single conversation
router.delete('/conversations/:id', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    console.error('[DELETE CONVERSATION ERROR]', err.message);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// POST /api/chat — send a message, get AI response
router.post('/', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { message, postContext, conversationId, conversationTitle, attachments } = req.body;
  const normalizedAttachments = sanitizeAttachments(attachments);
  const textMessage = typeof message === 'string' ? message.trim() : '';

  if (!textMessage && normalizedAttachments.length === 0) {
    return res.status(400).json({ error: 'message or attachment is required' });
  }

  if (!openai) {
    return res.status(503).json({ error: 'AI service not configured (missing OPENROUTER_API_KEY)' });
  }

  try {
    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const { data: newConv, error: convErr } = await supabase
        .from('chat_conversations')
        .insert({ user_id: userId, title: conversationTitle || await generateTitle(textMessage || 'Image question') })
        .select('id')
        .single();
      if (convErr) throw convErr;
      convId = newConv.id;
    }

    // Save user message
    await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        conversation_id: convId,
        role: 'user',
        content: textMessage || '[Image attached]',
      });

    // Update conversation title if first message
    const { count: msgCount } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', convId);

    await syncConversationMetadata(convId, textMessage || 'Image question', msgCount);

    // Fetch conversation history for context
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: false })
      .limit(20);

    const conversationMessages = (history || []).reverse().map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Check if pantry query with empty pantry — respond directly without AI
    // But skip this if the user is asking for post suggestions
    const isPantryQuery = hasPantryIntent(textMessage);
    const isPostSuggestionQuery = hasPostSuggestionIntent(textMessage);
    if (isPantryQuery && !postContext && !isPostSuggestionQuery) {
      const { count: pantryCount } = await supabase
        .from('pantry_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (!pantryCount || pantryCount === 0) {
        const emptyMsg = "Your pantry is currently empty! Head over to the **Pantry** tab to add ingredients, and then I can suggest recipes based on what you have.";
        const { data: saved } = await supabase
          .from('chat_messages')
          .insert({ user_id: userId, conversation_id: convId, role: 'assistant', content: emptyMsg })
          .select('id, role, content, created_at')
          .single();
        return res.json({ ...saved, conversationId: convId });
      }
    }

    // Check if user wants post suggestions — search BEFORE building system prompt
    let suggestedPosts = [];
    if (isPostSuggestionQuery && !postContext) {
      const keywords = extractSearchKeywords(textMessage);
      suggestedPosts = await searchPosts(keywords, 3);
    }

    let systemPrompt = await buildSystemPrompt(userId, isPantryQuery, isPostSuggestionQuery, suggestedPosts.length > 0);

    // Inject post context if provided
    if (postContext) {
      let postSection = '\n\nThe user is asking about a specific post:';
      if (postContext.username) postSection += `\nPosted by: ${postContext.username}`;
      if (postContext.caption) postSection += `\nCaption: "${postContext.caption}"`;
      if (postContext.tags?.length) postSection += `\nTags: ${postContext.tags.join(', ')}`;
      if (postContext.recipe) {
        postSection += formatRecipeForSystemPrompt(postContext.recipe);
      }
      postSection += '\n\nAnswer questions specifically about this post/recipe. If asked about substitutions, variations, or techniques related to it, give detailed helpful answers.';
      systemPrompt += postSection;
    }

    if (suggestedPosts.length > 0) {
      const postList = suggestedPosts.map(p => formatPostForPrompt(p)).join('\n\n---\n\n');
      systemPrompt += `\n\n## BetrFood Recipes Found\n\nHere are the recipes found matching the user's query:\n\n${postList}\n\n## Instructions for AI\n\nWhen the user asks about these recipes, reference the information above including the cooking steps. If they ask to see the full recipe, mention they can tap the post card to view details. When listing the recipes, include their ingredients and cooking steps in your response.`;
    }

    const aiMessages = [...conversationMessages];
    if (normalizedAttachments.length && aiMessages.length > 0) {
      aiMessages[aiMessages.length - 1] = {
        role: 'user',
        content: buildUserMessageContent(textMessage, normalizedAttachments),
      };
    }

    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        ...aiMessages,
      ],
    });

    const assistantContent = response.choices[0].message.content;

    const { data: saved } = await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        conversation_id: convId,
        role: 'assistant',
        content: assistantContent,
        suggested_posts: suggestedPosts,
      })
      .select('id, role, content, created_at')
      .single();

    res.json({ ...saved, conversationId: convId, suggestedPosts: suggestedPosts.length > 0 ? suggestedPosts : undefined });
  } catch (err) {
    console.error('[CHAT ERROR]', err.message, err.stack);
    res.status(500).json({ error: 'Failed to get AI response', details: err.message });
  }
});

// GET /api/chat/pantry-suggestions — generate recipe suggestions from current pantry
router.get('/pantry-suggestions', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const conversationId = req.query.conversationId;

  if (!openai) {
    return res.status(503).json({ error: 'AI service not configured (missing OPENROUTER_API_KEY)' });
  }

  try {
    let convId = conversationId;
    if (!convId) {
      const { data: newConv, error: convErr } = await supabase
        .from('chat_conversations')
        .insert({ user_id: userId, title: 'Pantry Recipes' })
        .select('id')
        .single();
      if (convErr) throw convErr;
      convId = newConv.id;
    }

    const { data: pantryItems } = await supabase
      .from('pantry_items')
      .select('name, quantity, unit, category, expiration_date')
      .eq('user_id', userId);

    if (!pantryItems || pantryItems.length === 0) {
      const emptyMsg = "Your pantry is currently empty! Head over to the **Pantry** tab to add ingredients, and then I can suggest recipes based on what you have.";
      await supabase
        .from('chat_messages')
        .insert({ user_id: userId, conversation_id: convId, role: 'user', content: 'What can I cook with the items in my pantry?' });
      const { data: saved } = await supabase
        .from('chat_messages')
        .insert({ user_id: userId, conversation_id: convId, role: 'assistant', content: emptyMsg })
        .select('id, role, content, created_at')
        .single();
      return res.json({ ...saved, pantryCount: 0, conversationId: convId });
    }

    const systemPrompt = await buildSystemPrompt(userId, true);

    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: 'What can I cook with the items in my pantry? Please suggest recipes based on what I have.',
        },
      ],
    });

    const suggestions = response.choices[0].message.content;

    await supabase
      .from('chat_messages')
      .insert({ user_id: userId, conversation_id: convId, role: 'user', content: 'What can I cook with the items in my pantry?' });

    const { data: saved } = await supabase
      .from('chat_messages')
      .insert({ user_id: userId, conversation_id: convId, role: 'assistant', content: suggestions })
      .select('id, role, content, created_at')
      .single();

    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', convId);

    res.json({ ...saved, pantryCount: pantryItems.length, conversationId: convId });
  } catch (err) {
    console.error('[PANTRY SUGGESTIONS ERROR]', err.message, err.stack);
    res.status(500).json({ error: 'Failed to get pantry suggestions', details: err.message });
  }
});

// POST /api/chat/stream — streaming AI response via SSE
router.post('/stream', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { message, conversationId, conversationTitle, postContext, attachments } = req.body;
  const normalizedAttachments = sanitizeAttachments(attachments);
  const textMessage = typeof message === 'string' ? message.trim() : '';

  if (!textMessage && normalizedAttachments.length === 0) {
    return res.status(400).json({ error: 'message or attachment is required' });
  }

  if (!openai) {
    return res.status(503).json({ error: 'AI service not configured (missing OPENROUTER_API_KEY)' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let aborted = false;
  req.on('close', () => { aborted = true; });

  try {
    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const { data: newConv, error: convErr } = await supabase
        .from('chat_conversations')
        .insert({ user_id: userId, title: conversationTitle || await generateTitle(textMessage || 'Image question') })
        .select('id')
        .single();
      if (convErr) throw convErr;
      convId = newConv.id;
    }

    // Save user message
    await supabase
      .from('chat_messages')
      .insert({
        user_id: userId,
        conversation_id: convId,
        role: 'user',
        content: textMessage || '[Image attached]',
      });

    const { count: msgCount } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', convId);

    await syncConversationMetadata(convId, textMessage || 'Image question', msgCount);

    // Fetch conversation history for context
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: false })
      .limit(20);

    const conversationMessages = (history || []).reverse().map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const isPantryQuery = hasPantryIntent(textMessage);
    const isPostSuggestionQuery = hasPostSuggestionIntent(textMessage);

    // Search for posts BEFORE building system prompt so we know if results exist
    let suggestedPosts = [];
    if (isPostSuggestionQuery && !postContext) {
      const keywords = extractSearchKeywords(textMessage);
      suggestedPosts = await searchPosts(keywords, 3);
    }

    let systemPrompt = await buildSystemPrompt(userId, isPantryQuery, isPostSuggestionQuery, suggestedPosts.length > 0);

    if (postContext) {
      let postSection = '\n\nThe user is asking about a specific post:';
      if (postContext.username) postSection += `\nPosted by: ${postContext.username}`;
      if (postContext.caption) postSection += `\nCaption: "${postContext.caption}"`;
      if (postContext.tags?.length) postSection += `\nTags: ${postContext.tags.join(', ')}`;
      if (postContext.recipe) {
        postSection += formatRecipeForSystemPrompt(postContext.recipe);
      }
      postSection += '\n\nAnswer questions specifically about this post/recipe.';
      systemPrompt += postSection;
    }

    if (suggestedPosts.length > 0) {
      const postList = suggestedPosts.map(p => formatPostForPrompt(p)).join('\n\n---\n\n');
      systemPrompt += `\n\n## BetrFood Recipes Found\n\nHere are the recipes found matching the user's query:\n\n${postList}\n\n## Instructions for AI\n\nWhen the user asks about these recipes, reference the information above including the cooking steps. If they ask to see the full recipe, mention they can tap the post card to view details. When listing the recipes, include their ingredients and cooking steps in your response.`;
    }

    const aiMessages = [...conversationMessages];
    if (normalizedAttachments.length && aiMessages.length > 0) {
      aiMessages[aiMessages.length - 1] = {
        role: 'user',
        content: buildUserMessageContent(textMessage, normalizedAttachments),
      };
    }

    const stream = await openai.chat.completions.create({
      model: CHAT_MODEL,
      max_tokens: 1024,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...aiMessages,
      ],
    });

    let fullContent = '';

    for await (const chunk of stream) {
      if (aborted) break;
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        fullContent += token;
        if (!res.writableEnded) res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }

    // Save the (possibly partial) assistant response, storing suggested posts for history
    if (fullContent) {
      const { data: saved } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          conversation_id: convId,
          role: 'assistant',
          content: fullContent,
          suggested_posts: suggestedPosts,
        })
        .select('id, role, content, created_at, suggested_posts')
        .single();

      const savedMessage = saved ? formatChatMessage(saved) : null;

      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ done: true, message: savedMessage, conversationId: convId, suggestedPosts: suggestedPosts.length > 0 ? suggestedPosts : undefined })}\n\n`);
      }
    }

    if (!res.writableEnded) res.end();
  } catch (err) {
    console.error('[CHAT STREAM ERROR]', err.message, err.stack);
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

// GET /api/chat/history — get conversation history (supports conversationId query param)
router.get('/history', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const conversationId = req.query.conversationId;

  try {
    let query = supabase
      .from('chat_messages')
      .select('id, role, content, created_at, conversation_id, suggested_posts')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }

    query = query.limit(50);

    const { data: messages, error } = await query;
    if (error) throw error;

    res.json({ messages: (messages || []).map(formatChatMessage) });
  } catch (err) {
    console.error('[CHAT HISTORY ERROR]', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch chat history', details: err.message });
  }
});

module.exports = router;
