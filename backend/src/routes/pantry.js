const express = require('express');
const supabase = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');
const OpenAI = require('openai');

const router = express.Router();

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'BetrFood',
  },
});

const IDENTIFY_SINGLE_PROMPT = `You are a food item identifier. Analyze this photo and identify the single main food or grocery item visible.

Return ONLY a JSON object (no markdown, no explanation) with:
- "name": string (common grocery name, e.g. "Banana", "Whole Milk", "Chicken Breast")
- "category": string (one of: "Produce", "Dairy", "Proteins", "Grains", "Spices", "Canned Goods", "Frozen", "Beverages", "Snacks", "Other")
- "confidence": number (0-100, how confident you are in the identification)

Example: {"name":"Banana","category":"Produce","confidence":95}

If no food item is visible, return: {"name":null,"category":null,"confidence":0}`;

const SCAN_RECEIPT_PROMPT = `You are a grocery receipt OCR and parser. Analyze this photo of a grocery store receipt.

Extract all purchased food/grocery items from the receipt. For each item:
1. Read the item name from the receipt text
2. Expand common receipt abbreviations (e.g., "BAN" → "Banana", "ORG" → "Organic", "GRN" → "Green", "WHT" → "White", "CHKN" → "Chicken", "BRD" → "Bread", "MLK" → "Milk", "YGT" → "Yogurt", "VEG" → "Vegetables", "FRZ" → "Frozen")
3. Estimate a reasonable quantity and unit
4. Assign a category

Return ONLY a JSON array (no markdown, no explanation) where each element has:
- "name": string (full readable item name, abbreviations expanded)
- "quantity": number (estimated from receipt or 1)
- "unit": string (e.g. "pcs", "lbs", "oz", "gal")
- "category": string (one of: "Produce", "Dairy", "Proteins", "Grains", "Spices", "Canned Goods", "Frozen", "Beverages", "Snacks", "Other")

Filter out non-food items like bags, tax lines, totals, subtotals, discounts, store info, and payment details.

Example: [{"name":"Organic Bananas","quantity":1,"unit":"bunch","category":"Produce"}]

If the receipt is unreadable or no food items found, return an empty array: []`;

const IDENTIFY_PROMPT = `You are a grocery item identifier. Analyze this photo and identify all visible food/grocery items.

Return ONLY a JSON array (no markdown, no explanation) where each element has:
- "name": string (common grocery name, e.g. "Banana", "Whole Milk")
- "quantity": number (estimated count or 1 if unsure)
- "unit": string (e.g. "pcs", "lbs", "oz", "gal", "bunch")
- "category": string (one of: "Produce", "Dairy", "Proteins", "Grains", "Spices", "Canned Goods", "Frozen", "Beverages", "Snacks", "Other")

Example: [{"name":"Banana","quantity":6,"unit":"pcs","category":"Produce"}]

If no food items are visible, return an empty array: []`;

// ─── helpers ────────────────────────────────────────────────────────────────
function getUserId(req) {
  return req.userId || (req.user && req.user.id) || req.headers['x-user-id'] || 'anonymous';
}

function stripCodeFences(raw) {
  return raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
}

// ─── Vision routes (defined BEFORE /:id to avoid path conflicts) ─────────────

// POST /api/pantry/identify — identify grocery items from a photo
router.post('/identify', requireAuth, async (req, res) => {
  const { image } = req.body;

  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'base64 image is required' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'openrouter/free',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: IDENTIFY_PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${image}` },
            },
          ],
        },
      ],
    });

    if (!response.choices || response.choices.length === 0) {
      return res.status(422).json({ error: 'AI returned no response. Try a clearer photo.' });
    }

    const raw = response.choices[0].message.content.trim();
    const items = JSON.parse(stripCodeFences(raw));

    if (!Array.isArray(items)) {
      return res.status(422).json({ error: 'AI did not return a valid item list' });
    }

    res.json({ items });
  } catch (err) {
    console.error('[IDENTIFY ERROR]', err.message);
    console.error('[IDENTIFY ERROR DETAIL]', JSON.stringify(err?.response?.data || err?.error || {}, null, 2));
    if (err instanceof SyntaxError) {
      return res.status(422).json({ error: 'AI response was not valid JSON' });
    }
    res.status(500).json({ error: 'Failed to identify items' });
  }
});

// POST /api/pantry/identify-single — identify a single food item from a photo
router.post('/identify-single', requireAuth, async (req, res) => {
  const { image } = req.body;

  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'base64 image is required' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'openrouter/free',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: IDENTIFY_SINGLE_PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${image}` },
            },
          ],
        },
      ],
    });

    if (!response.choices || response.choices.length === 0) {
      return res.status(422).json({ error: 'AI returned no response. Try a clearer photo.' });
    }

    const raw = response.choices[0].message.content.trim();
    const item = JSON.parse(stripCodeFences(raw));

    if (typeof item !== 'object' || Array.isArray(item)) {
      return res.status(422).json({ error: 'AI did not return a valid item object' });
    }

    res.json({ name: item.name, category: item.category, confidence: item.confidence });
  } catch (err) {
    console.error('[IDENTIFY-SINGLE ERROR]', err.message);
    console.error('[IDENTIFY-SINGLE ERROR DETAIL]', JSON.stringify(err?.response?.data || err?.error || {}, null, 2));
    if (err instanceof SyntaxError) {
      return res.status(422).json({ error: 'AI response was not valid JSON' });
    }
    res.status(500).json({ error: 'Failed to identify item' });
  }
});

// POST /api/pantry/scan-receipt — extract grocery items from a receipt photo
router.post('/scan-receipt', requireAuth, async (req, res) => {
  const { image } = req.body;

  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'base64 image is required' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'openrouter/free',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: SCAN_RECEIPT_PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${image}` },
            },
          ],
        },
      ],
    });

    if (!response.choices || response.choices.length === 0) {
      return res.status(422).json({ error: 'AI returned no response. Try a clearer photo.' });
    }

    const raw = response.choices[0].message.content.trim();
    const items = JSON.parse(stripCodeFences(raw));

    if (!Array.isArray(items)) {
      return res.status(422).json({ error: 'AI did not return a valid item list' });
    }

    res.json({ items });
  } catch (err) {
    console.error('[SCAN-RECEIPT ERROR]', err.message);
    console.error('[SCAN-RECEIPT ERROR DETAIL]', JSON.stringify(err?.response?.data || err?.error || {}, null, 2));
    if (err instanceof SyntaxError) {
      return res.status(422).json({ error: 'AI response was not valid JSON' });
    }
    res.status(500).json({ error: 'Failed to scan receipt' });
  }
});

// ─── CRUD routes ─────────────────────────────────────────────────────────────

// GET /api/pantry
router.get('/', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('user_id', userId)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// GET /api/pantry/:id
router.get('/:id', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', userId)
    .single();

  if (error) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

// POST /api/pantry
router.post('/', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { name, quantity, unit, category, expirationDate } = req.body;

  if (!name || typeof quantity !== 'number') {
    return res.status(400).json({ error: 'name + numeric quantity required' });
  }

  const payload = {
    user_id: userId,
    name,
    quantity,
    unit: unit || '',
    category: category || 'Other',
    expiration_date: expirationDate || null,
  };

  const { data, error } = await supabase
    .from('pantry_items')
    .insert(payload)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/pantry/:id
router.put('/:id', requireAuth, async (req, res) => {
  const userId = getUserId(req);

  const { name, quantity, unit, category, expirationDate } = req.body;
  const updates = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (quantity !== undefined) updates.quantity = quantity;
  if (unit !== undefined) updates.unit = unit;
  if (category !== undefined) updates.category = category;
  if (expirationDate !== undefined) updates.expiration_date = expirationDate;

  const { data, error } = await supabase
    .from('pantry_items')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) return res.status(404).json({ error: 'Not found or no permission' });
  res.json(data);
});

// DELETE /api/pantry/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { error } = await supabase
    .from('pantry_items')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', userId);

  if (error) return res.status(404).json({ error: 'Not found or no permission' });
  res.json({ message: 'Deleted' });
});

module.exports = router;
