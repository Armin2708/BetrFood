const express = require('express');
const supabase = require('../db/supabase');

const router = express.Router();

function buildFaqResponse(categories, items) {
  const itemsByCategory = new Map();
  for (const item of items) {
    if (!itemsByCategory.has(item.category_id)) {
      itemsByCategory.set(item.category_id, []);
    }
    itemsByCategory.get(item.category_id).push({
      id: item.id,
      question: item.question,
      answer: item.answer,
    });
  }

  return categories
    .map((category) => ({
      id: category.id,
      title: category.title,
      icon: category.icon,
      items: itemsByCategory.get(category.id) || [],
    }))
    .filter((category) => category.items.length > 0);
}

function getFaqHandler(dbClient = supabase) {
  return async function getFaq(req, res) {
    try {
      const { data: categories, error: categoriesError } = await dbClient
        .from('faq_categories')
        .select('id, title, icon, sort_order')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      if (categoriesError) throw categoriesError;

      const { data: items, error: itemsError } = await dbClient
        .from('faq_items')
        .select('id, category_id, question, answer, sort_order')
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      if (itemsError) throw itemsError;

      return res.json({ categories: buildFaqResponse(categories || [], items || []) });
    } catch (error) {
      console.error('Error fetching FAQ:', error);
      return res.status(500).json({ error: 'Failed to load FAQ.' });
    }
  };
}

const getFaq = getFaqHandler();

function recordFaqViewHandler(dbClient = supabase) {
  return async function recordFaqView(req, res) {
    const itemId = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!itemId) {
      return res.status(400).json({ error: 'Missing FAQ item id.' });
    }
    try {
      const { error } = await dbClient.rpc('record_faq_view', { p_item_id: itemId });
      if (error) throw error;
      return res.status(204).send();
    } catch (error) {
      console.error('Error recording FAQ view:', error);
      return res.status(500).json({ error: 'Failed to record FAQ view.' });
    }
  };
}

const recordFaqView = recordFaqViewHandler();

router.get('/', getFaq);
router.post('/items/:id/view', recordFaqView);

module.exports = router;
module.exports.getFaqHandler = getFaqHandler;
module.exports.getFaq = getFaq;
module.exports.recordFaqViewHandler = recordFaqViewHandler;
module.exports.recordFaqView = recordFaqView;
