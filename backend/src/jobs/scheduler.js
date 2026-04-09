const cron = require('node-cron');
const supabase = require('../db/supabase');
const { calculateUserPreferenceVector, saveUserPreferenceVector } = require('../utils/recommendationEngine');

/**
 * Update preference vectors for all active users
 * This runs once per day at 2 AM UTC
 */
async function updateAllUserPreferenceVectors() {
  console.log('[PREF-VECTORS] Starting preference vector update job...');
  try {
    // Get all users who have been active in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: activeUsers, error: usersError } = await supabase
      .from('user_profiles')
      .select('id')
      .gte('updated_at', thirtyDaysAgo.toISOString());

    if (usersError) throw usersError;

    if (!activeUsers || activeUsers.length === 0) {
      console.log('[PREF-VECTORS] No active users to update');
      return;
    }

    console.log(`[PREF-VECTORS] Updating preference vectors for ${activeUsers.length} users...`);

    let successCount = 0;
    let errorCount = 0;

    // Process users in batches to avoid overwhelming the system
    const BATCH_SIZE = 10;
    for (let i = 0; i < activeUsers.length; i += BATCH_SIZE) {
      const batch = activeUsers.slice(i, i + BATCH_SIZE);

      // Process batch in parallel
      const results = await Promise.allSettled(
        batch.map(async (user) => {
          try {
            // Fetch user preferences for cold-start
            const { data: userPrefs } = await supabase
              .from('user_preferences')
              .select('*')
              .eq('user_id', user.id)
              .single();

            // Calculate new preference vector
            const vector = await calculateUserPreferenceVector(user.id, userPrefs || {});

            // Save to database
            await saveUserPreferenceVector(user.id, vector);

            console.log(`[PREF-VECTORS] ✓ Updated user ${user.id}`);
            return { userId: user.id, success: true };
          } catch (err) {
            console.error(`[PREF-VECTORS] ✗ Error updating user ${user.id}:`, err.message);
            return { userId: user.id, success: false, error: err.message };
          }
        })
      );

      // Count results
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) successCount += 1;
          else errorCount += 1;
        } else {
          errorCount += 1;
        }
      });
    }

    console.log(
      `[PREF-VECTORS] Job completed. Success: ${successCount}, Errors: ${errorCount}`
    );
  } catch (error) {
    console.error('[PREF-VECTORS] Fatal error in preference vector update job:', error.message);
  }
}

/**
 * Initialize the scheduler
 * Sets up recurring jobs that run on a schedule
 */
function initializeScheduler() {
  console.log('[SCHEDULER] Initializing job scheduler...');

  // Schedule preference vector update: Every day at 2:00 AM UTC
  // Cron format: minute, hour, day, month, day-of-week
  const updateVectorsCron = cron.schedule('0 2 * * *', async () => {
    console.log('[SCHEDULER] Running scheduled preference vector update (2 AM UTC)');
    await updateAllUserPreferenceVectors();
  });

  console.log('[SCHEDULER] ✓ Preference vector update scheduled for 2 AM UTC daily');

  // Optional: Allow manual trigger via HTTP endpoint (useful for testing)
  // This is set up in the admin routes if needed

  // Log next execution times
  const now = new Date();
  const nextExecution = new Date(now);
  nextExecution.setUTCHours(2, 0, 0, 0);
  if (nextExecution <= now) {
    nextExecution.setUTCDate(nextExecution.getUTCDate() + 1);
  }

  console.log(`[SCHEDULER] Next preference vector update: ${nextExecution.toUTCString()}`);

  return {
    updateVectorsCron,
    updateAllUserPreferenceVectors, // Expose for manual triggering
  };
}

/**
 * Manually trigger preference vector update (for testing or admin endpoints)
 */
async function manuallyUpdatePreferenceVectors() {
  console.log('[SCHEDULER] Manual preference vector update triggered');
  await updateAllUserPreferenceVectors();
}

module.exports = {
  initializeScheduler,
  updateAllUserPreferenceVectors,
  manuallyUpdatePreferenceVectors,
};
