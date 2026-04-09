import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { trackPostView } from '../services/api/interactions';

/**
 * Hook to track how long a user views a post
 * Records view duration when component unmounts or app goes to background
 *
 * @param postId - The ID of the post being viewed
 * @param options - Optional configuration
 */
export function usePostViewTracking(
  postId: string | undefined,
  options?: {
    minDurationSeconds?: number; // Minimum duration to record (default: 2)
    onViewEnd?: (durationSeconds: number) => void; // Callback when view ends
  }
) {
  const viewStartRef = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const minDurationRef = useRef(options?.minDurationSeconds ?? 2);

  useEffect(() => {
    if (!postId) return;

    // Track view start
    viewStartRef.current = Date.now();

    // Handle app state changes (pause/resume)
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      // Cleanup: record view when component unmounts
      recordView();
      subscription.remove?.();
    };
  }, [postId]);

  const handleAppStateChange = async (state: AppStateStatus) => {
    // Stop tracking when app goes to background
    if (state === 'inactive' || state === 'background') {
      if (viewStartRef.current) {
        recordView();
        viewStartRef.current = null; // Clear start time
      }
    }
    // Resume tracking if app comes back to foreground
    else if (state === 'active' && !viewStartRef.current) {
      viewStartRef.current = Date.now();
    }
    appStateRef.current = state;
  };

  const recordView = async () => {
    if (!postId || !viewStartRef.current) return;

    const durationSeconds = Math.round((Date.now() - viewStartRef.current) / 1000);

    // Only record if viewed for minimum duration
    if (durationSeconds >= minDurationRef.current) {
      try {
        await trackPostView(postId, durationSeconds);
        options?.onViewEnd?.(durationSeconds);
      } catch (error) {
        console.warn('Failed to track post view:', error);
        // Don't throw - this shouldn't break the UI
      }
    }
  };
}
