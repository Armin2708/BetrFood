-- faq_categories and faq_items: remotely updatable Help & FAQ content
-- The Help & Support screen reads from these tables so support staff can
-- edit answers without shipping a new app build. Rows are public reads;
-- only service role / admin should be able to insert or update.

CREATE TABLE IF NOT EXISTS faq_categories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faq_categories_sort_order
  ON faq_categories(sort_order);

CREATE TABLE IF NOT EXISTS faq_items (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES faq_categories(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faq_items_category_id
  ON faq_items(category_id);

CREATE INDEX IF NOT EXISTS idx_faq_items_sort_order
  ON faq_items(sort_order);

CREATE INDEX IF NOT EXISTS idx_faq_items_view_count
  ON faq_items(view_count DESC);

-- record_faq_view: increments the view counter and updates last_viewed_at
-- for an FAQ item. Used by POST /api/faq/items/:id/view from the help screen
-- whenever a user expands a question. No-op if the id does not exist.
CREATE OR REPLACE FUNCTION record_faq_view(p_item_id TEXT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE faq_items
  SET
    view_count = view_count + 1,
    last_viewed_at = now()
  WHERE id = p_item_id;
END;
$$;

INSERT INTO faq_categories (id, title, icon, sort_order) VALUES
  ('account', 'Account', 'person-circle-outline', 10),
  ('pantry', 'Pantry', 'basket-outline', 20),
  ('posting', 'Posting', 'create-outline', 30),
  ('notifications', 'Notifications', 'notifications-outline', 40),
  ('privacy', 'Privacy', 'lock-closed-outline', 50),
  ('recipes', 'Recipes', 'restaurant-outline', 60),
  ('troubleshooting', 'Troubleshooting', 'construct-outline', 70)
ON CONFLICT (id) DO NOTHING;

INSERT INTO faq_items (id, category_id, question, answer, sort_order) VALUES
  ('account-create', 'account', 'How do I create a BetrFood account?',
    'Tap "Sign Up" on the welcome screen and register with your email, Apple, or Google account. You can edit your display name and profile photo any time from the Profile tab.', 10),
  ('account-reset-password', 'account', 'How do I reset my password?',
    'From the login screen, tap "Forgot password?" and enter the email linked to your account. We will send a password reset link within a few minutes — check your spam folder if you do not see it.', 20),
  ('account-change-email', 'account', 'Can I change the email address on my account?',
    'Yes. Go to Profile > Settings > Account and tap your email address to update it. You will need to verify the new email before the change takes effect.', 30),
  ('account-delete', 'account', 'How do I delete my account?',
    'Open Profile > Settings and scroll to the Account section, then tap "Delete Account" and confirm. Deletion is permanent and removes your posts, comments, follows, and saved data.', 40),

  ('pantry-add', 'pantry', 'How do I add an item to my pantry?',
    'Open the Pantry tab and tap the plus button. You can scan a barcode, search the food database, or add a custom item with your own name and quantity.', 10),
  ('pantry-expiry', 'pantry', 'Why is an item showing as expired?',
    'BetrFood tracks expiry dates you enter manually or from barcode scans. If the date looks wrong, tap the item and edit the "Expires on" field to correct it.', 20),
  ('pantry-recipes', 'pantry', 'How does "Cook with what I have" work?',
    'We match recipes against the ingredients currently in your pantry, prioritising items nearing expiry. Recipes that require only a couple of extra ingredients are also suggested and labelled accordingly.', 30),

  ('posting-create', 'posting', 'How do I share a recipe or food photo?',
    'Tap the plus button in the bottom tab bar, choose a photo or video, then add a caption, tags, and optional recipe steps. Posts are visible to your followers immediately after publishing.', 10),
  ('posting-edit', 'posting', 'Can I edit a post after publishing?',
    'You can edit the caption, tags, and recipe details of any post you own. Open the post, tap the menu icon in the top right, and choose "Edit". The media itself cannot be changed after publishing.', 20),
  ('posting-delete', 'posting', 'How do I delete one of my posts?',
    'Open the post, tap the menu icon, and choose "Delete". Deletion is permanent and will also remove the post''s likes and comments.', 30),
  ('posting-hashtags', 'posting', 'How do hashtags work?',
    'Hashtags help others discover your post. Type # followed by a keyword in your caption (for example, #mealprep). Tap any hashtag to see trending posts using the same tag.', 40),

  ('notifications-disable-all', 'notifications', 'How do I turn off all push notifications?',
    'Go to Profile > Settings > Notifications and toggle "Push notifications" off. This pauses all notification types from BetrFood without affecting your account.', 10),
  ('notifications-types', 'notifications', 'Can I choose which notifications I get?',
    'Yes — under Profile > Settings > Notifications you can individually enable or disable likes, comments, follows, mentions, and recipe reminders.', 20),
  ('notifications-not-arriving', 'notifications', 'Why am I not receiving notifications?',
    'Check that notifications are enabled both in BetrFood (Settings > Notifications) and in your device''s system settings for BetrFood. Do Not Disturb and focus modes can also silence them.', 30),

  ('privacy-profile', 'privacy', 'How do I make my profile private?',
    'Go to Profile > Settings > Privacy and turn off "Public Profile". Only accounts you approve as followers will be able to see your posts and activity.', 10),
  ('privacy-block', 'privacy', 'What happens when I block someone?',
    'Blocked users cannot see your profile, posts, or comments, and cannot follow or message you. They are not notified that you blocked them.', 20),
  ('privacy-data', 'privacy', 'What data does BetrFood collect about me?',
    'We collect the content you create, your pantry and recipe activity, and basic device diagnostics. Full details are in our Privacy Policy, linked from Settings > Legal.', 30),

  ('recipes-save', 'recipes', 'How do I save a recipe for later?',
    'Tap the bookmark icon on any recipe to save it. Saved recipes appear in Profile > Collections, where you can organise them into folders such as "Weeknight" or "Desserts".', 10),
  ('recipes-scale', 'recipes', 'Can I scale a recipe up or down?',
    'Open the recipe and tap the serving count near the top. Adjust it to the number of servings you need — ingredient quantities update automatically.', 20),
  ('recipes-missing-steps', 'recipes', 'A recipe I posted is missing steps after editing — what happened?',
    'Recipe steps are saved separately from the caption. If steps appear blank after an edit, reopen the editor, re-add the steps, and save again. If the problem persists, contact support.', 30),

  ('trouble-crash', 'troubleshooting', 'The app keeps crashing — what should I try first?',
    'Force-quit BetrFood and reopen it, then make sure you are on the latest version from the App Store or Play Store. If it still crashes, restart your device and try again.', 10),
  ('trouble-upload', 'troubleshooting', 'My photo or video upload keeps failing.',
    'Uploads need a stable connection. Switch between Wi-Fi and cellular, make sure the file is under 100MB, and retry. If the issue continues, try uploading a smaller version of the media.', 20),
  ('trouble-contact', 'troubleshooting', 'Something else is wrong — how do I contact support?',
    'Email support@betrfood.com with a short description of the issue and, if possible, a screenshot. Please include your app version (shown in Settings > App Information) so we can help faster.', 30)
ON CONFLICT (id) DO NOTHING;
