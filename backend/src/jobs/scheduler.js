const cron = require('node-cron');
const supabase = require('../db/supabase');
const { calculateUserPreferenceVector, saveUserPreferenceVector } = require('../utils/recommendationEngine');
const { aggregateUserData } = require('../utils/exportUtils');
const { sendEmail } = require('../utils/email');
const { getClerkUserEmail } = require('../routes/profiles');

/**
 * Process a single pending export request.
 */
async function processExportRequest(request) {
  const { id: requestId, user_id: userId } = request;

  console.log(`[EXPORT] Processing request ${requestId} for user ${userId}`);

  // Mark as processing
  await supabase
    .from('data_export_requests')
    .update({ status: 'processing' })
    .eq('id', requestId);

  try {
    // 1. Aggregate user data
    const userData = await aggregateUserData(userId);

    // 2. Write JSON to a temp file
    const exportJson = JSON.stringify(userData, null, 2);
    const filename = `exports/${userId}/${requestId}.json`;
    const fileBuffer = Buffer.from(exportJson, 'utf8');

    // 3. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('post-media')
      .upload(filename, fileBuffer, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // 4. Generate a signed URL valid for 24 hours
    const expiresInSeconds = 60 * 60 * 24; // 24 hours
    const { data: signedData, error: signedError } = await supabase.storage
      .from('post-media')
      .createSignedUrl(filename, expiresInSeconds);

    if (signedError) throw new Error(`Failed to create signed URL: ${signedError.message}`);

    const downloadUrl = signedData.signedUrl;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    const now = new Date().toISOString();

    // 5. Mark request as ready
    await supabase
      .from('data_export_requests')
      .update({
        status: 'ready',
        download_url: downloadUrl,
        expires_at: expiresAt,
        completed_at: now,
      })
      .eq('id', requestId);

    // 6. Email notification (fire-and-forget)
    getClerkUserEmail(userId)
      .then((email) => {
        if (!email) return;
        const expiresDate = new Date(expiresAt).toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
        return sendEmail({
          to: email,
          subject: 'Your BetrFood Data Export is Ready',
          text: [
            'Your BetrFood data export is ready for download.',
            '',
            `Download link: ${downloadUrl}`,
            '',
            `This link expires on ${expiresDate}.`,
            '',
            'Your export includes your profile, posts, recipes, pantry, collections, likes, comments, and follow relationships in JSON format.',
            '',
            'The BetrFood Team',
          ].join('\n'),
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
              <h2 style="color:#0F172A;margin-bottom:8px">Your data export is ready</h2>
              <p style="color:#64748B;margin-bottom:24px">
                Your BetrFood data export has been generated. Click the button below to download your data.
              </p>
              <a href="${downloadUrl}"
                 style="display:inline-block;background:#22C55E;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px">
                Download My Data
              </a>
              <p style="color:#94A3B8;font-size:13px;margin-top:20px">
                This link expires on ${expiresDate}. Your export includes your profile, posts, recipes,
                pantry items, collections, likes, comments, and follow relationships in JSON format.
              </p>
            </div>`,
        });
      })
      .catch((err) => console.error(`[EXPORT] Email notification failed for request ${requestId}:`, err.message));

    console.log(`[EXPORT] ✓ Request ${requestId} completed`);
  } catch (err) {
    console.error(`[EXPORT] ✗ Request ${requestId} failed:`, err.message);

    await supabase
      .from('data_export_requests')
      .update({
        status: 'failed',
        error_message: err.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', requestId);
  }
}

/**
 * Process all pending data export requests.
 * Runs every 5 minutes.
 */
async function processAllPendingExports() {
  console.log('[EXPORT] Checking for pending export requests...');
  try {
    const { data: pending, error } = await supabase
      .from('data_export_requests')
      .select('id, user_id')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })
      .limit(10); // Process up to 10 at a time

    if (error) throw error;

    if (!pending || pending.length === 0) {
      return;
    }

    console.log(`[EXPORT] Found ${pending.length} pending export request(s)`);

    // Process sequentially to avoid overwhelming storage
    for (const request of pending) {
      await processExportRequest(request);
    }
  } catch (err) {
    console.error('[EXPORT] Error processing pending exports:', err.message);
  }
}

/**
 * Update preference vectors for all active users.
 * Runs once per day at 2 AM UTC.
 */
async function updateAllUserPreferenceVectors() {
  console.log('[PREF-VECTORS] Starting preference vector update job...');
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: activeUsers, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, dietary_preferences')
      .gte('updated_at', thirtyDaysAgo.toISOString());

    if (usersError) throw usersError;

    if (!activeUsers || activeUsers.length === 0) {
      console.log('[PREF-VECTORS] No active users to update');
      return;
    }

    console.log(`[PREF-VECTORS] Updating preference vectors for ${activeUsers.length} users...`);

    let successCount = 0;
    let errorCount = 0;

    const BATCH_SIZE = 10;
    for (let i = 0; i < activeUsers.length; i += BATCH_SIZE) {
      const batch = activeUsers.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (user) => {
          try {
            const { data: userPrefs } = await supabase
              .from('user_preferences')
              .select('*')
              .eq('user_id', user.id)
              .single();

            // Calculate new preference vector
            const vector = await calculateUserPreferenceVector(user.id, {
              ...(userPrefs || {}),
              profile_dietary_preferences: user.dietary_preferences || [],
            });

            await saveUserPreferenceVector(user.id, vector);

            console.log(`[PREF-VECTORS] ✓ Updated user ${user.id}`);
            return { userId: user.id, success: true };
          } catch (err) {
            console.error(`[PREF-VECTORS] ✗ Error updating user ${user.id}:`, err.message);
            return { userId: user.id, success: false, error: err.message };
          }
        })
      );

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) successCount += 1;
          else errorCount += 1;
        } else {
          errorCount += 1;
        }
      });
    }

    console.log(`[PREF-VECTORS] Job completed. Success: ${successCount}, Errors: ${errorCount}`);
  } catch (error) {
    console.error('[PREF-VECTORS] Fatal error in preference vector update job:', error.message);
  }
}

/**
 * Initialize the scheduler.
 */
function initializeScheduler() {
  console.log('[SCHEDULER] Initializing job scheduler...');

  // Preference vectors: every day at 2 AM UTC
  cron.schedule('0 2 * * *', async () => {
    console.log('[SCHEDULER] Running scheduled preference vector update (2 AM UTC)');
    await updateAllUserPreferenceVectors();
  });

  // Data exports: every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await processAllPendingExports();
  });

  console.log('[SCHEDULER] ✓ Preference vector update scheduled for 2 AM UTC daily');
  console.log('[SCHEDULER] ✓ Data export processing scheduled every 5 minutes');

  const now = new Date();
  const nextExecution = new Date(now);
  nextExecution.setUTCHours(2, 0, 0, 0);
  if (nextExecution <= now) {
    nextExecution.setUTCDate(nextExecution.getUTCDate() + 1);
  }
  console.log(`[SCHEDULER] Next preference vector update: ${nextExecution.toUTCString()}`);

  return {
    updateAllUserPreferenceVectors,
    processAllPendingExports,
  };
}

module.exports = {
  initializeScheduler,
  updateAllUserPreferenceVectors,
  processAllPendingExports,
};
