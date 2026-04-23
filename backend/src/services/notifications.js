const supabase = require('../db/supabase');

/**
 * Notification dispatch stubs (issue #114).
 *
 * Each function below is a future-proof hook: the preference check is wired up
 * so that once the originating feature lands (e.g. a new follow, a like,
 * a reply), the event producer can call `dispatch<Type>Notification(...)` and
 * users' granular toggles will already be respected.
 *
 * No call sites exist yet — the source events have not been implemented. Each
 * stub returns early after consulting the user's preferences so that the
 * control surface (backend + frontend) can be shipped independently of the
 * underlying feature work.
 */

/**
 * Load the notification-relevant preference row for a user.
 * Returns null when the row does not exist — callers should treat that as
 * "all defaults, enabled".
 */
async function getPreferences(userId) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select(
      'notifications_enabled, expiration_notifications_enabled, notif_new_follower, notif_likes, notif_comments, notif_comment_replies, notif_ai_chat, notif_weekly_digest'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[notifications] Failed to load preferences for user', userId, error);
    return null;
  }

  return data;
}

/**
 * True when the user should receive notifications of the given per-type flag.
 * Respects the global toggle — a disabled global short-circuits everything.
 */
function shouldDispatch(prefs, typeFlagColumn) {
  if (!prefs) return true; // No row yet: treat as enabled (defaults are true).
  if (prefs.notifications_enabled === false) return false;
  if (prefs[typeFlagColumn] === false) return false;
  return true;
}

/**
 * TODO(#114): Call when a user gains a new follower.
 * Expected call site: the follow-create handler in backend/src/routes/follows.js
 * once the "create notification on follow" feature is implemented.
 */
async function dispatchNewFollowerNotification(userId, actorId) {
  const prefs = await getPreferences(userId);
  if (!shouldDispatch(prefs, 'notif_new_follower')) return;
  // TODO(#114): insert a row into the `notifications` table with
  // type='new_follower' and data={ actorId } once the follow-event
  // integration lands.
}

/**
 * TODO(#114): Call when a user's post or comment is liked.
 * Expected call site: the like-create handler in backend/src/routes/likes.js
 * once the "create notification on like" feature is implemented.
 */
async function dispatchLikeNotification(userId, actorId, targetType, targetId) {
  const prefs = await getPreferences(userId);
  if (!shouldDispatch(prefs, 'notif_likes')) return;
  // TODO(#114): insert a row into the `notifications` table with
  // type='like' and data={ actorId, targetType, targetId }.
}

/**
 * TODO(#114): Call when someone comments on the user's post.
 * Expected call site: the comment-create handler in
 * backend/src/routes/comments.js once comment notifications are wired up.
 */
async function dispatchCommentNotification(userId, actorId, postId, commentId) {
  const prefs = await getPreferences(userId);
  if (!shouldDispatch(prefs, 'notif_comments')) return;
  // TODO(#114): insert a row into the `notifications` table with
  // type='comment' and data={ actorId, postId, commentId }.
}

/**
 * TODO(#114): Call when someone replies to the user's comment.
 * Expected call site: the comment-reply handler in
 * backend/src/routes/comments.js once reply notifications are wired up.
 */
async function dispatchCommentReplyNotification(userId, actorId, postId, parentCommentId, replyId) {
  const prefs = await getPreferences(userId);
  if (!shouldDispatch(prefs, 'notif_comment_replies')) return;
  // TODO(#114): insert a row into the `notifications` table with
  // type='comment_reply' and data={ actorId, postId, parentCommentId, replyId }.
}

/**
 * TODO(#114): Call when the AI chat surfaces a proactive suggestion.
 * Expected call site: the AI-chat pipeline in backend/src/routes/chat.js once
 * push-style AI suggestions are implemented.
 */
async function dispatchAiChatNotification(userId, suggestionPayload) {
  const prefs = await getPreferences(userId);
  if (!shouldDispatch(prefs, 'notif_ai_chat')) return;
  // TODO(#114): insert a row into the `notifications` table with
  // type='ai_chat' and data=suggestionPayload.
}

/**
 * TODO(#114): Call when the weekly digest cron fires for a user.
 * Expected call site: a scheduled job under backend/src/jobs once the weekly
 * digest feature is built.
 */
async function dispatchWeeklyDigestNotification(userId, digestPayload) {
  const prefs = await getPreferences(userId);
  if (!shouldDispatch(prefs, 'notif_weekly_digest')) return;
  // TODO(#114): insert a row into the `notifications` table with
  // type='weekly_digest' and data=digestPayload.
}

module.exports = {
  getPreferences,
  shouldDispatch,
  dispatchNewFollowerNotification,
  dispatchLikeNotification,
  dispatchCommentNotification,
  dispatchCommentReplyNotification,
  dispatchAiChatNotification,
  dispatchWeeklyDigestNotification,
};
