import { API_BASE_URL, authHeaders } from './client';

export interface InteractionResponse {
  success: boolean;
  postId: string;
  message?: string;
}

/**
 * Track post view - record when user views a post and for how long
 * @param postId - The ID of the post viewed
 * @param viewDurationSeconds - How long the user viewed the post in seconds
 */
export async function trackPostView(
  postId: string,
  viewDurationSeconds: number
): Promise<{ recorded: boolean; reason?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/interactions/post-view`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
    },
    body: JSON.stringify({
      postId,
      viewDurationSeconds,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to track post view');
  }

  return response.json();
}

/**
 * Mark a post as "not interested" - tells the system to show fewer similar posts
 * @param postId - The ID of the post
 */
export async function markPostNotInterested(postId: string): Promise<InteractionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/interactions/not-interested`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
    },
    body: JSON.stringify({ postId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to mark post as not interested');
  }

  return response.json();
}

/**
 * Undo "not interested" feedback on a post
 * @param postId - The ID of the post
 */
export async function removeNotInterestedFeedback(postId: string): Promise<InteractionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/interactions/not-interested/${postId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove not interested feedback');
  }

  return response.json();
}

/**
 * Get all posts the user has marked as "not interested"
 */
export async function getNotInterestedPosts(): Promise<{ notInterestedPostIds: string[]; count: number }> {
  const response = await fetch(`${API_BASE_URL}/api/interactions/not-interested`, {
    headers: await authHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch not interested posts');
  }

  return response.json();
}

export interface ResetRecommendationsResponse {
  message: string;
  deleted: {
    impressions: number;
    negativeFeedback: number;
    preferenceVector: number;
  };
}

/**
 * Clear all recommendation-signal data for the current user:
 * view history (post_impressions), "not interested" feedback, and the learned preference vector.
 * After calling this, the For You feed reverts to non-personalized content.
 */
export async function resetRecommendations(): Promise<ResetRecommendationsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/users/me/reset-recommendations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to reset recommendations');
  }

  return response.json();
}
