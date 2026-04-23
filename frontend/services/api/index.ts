// Re-export everything for backward compatibility
// Existing imports like `import { fetchPosts } from '../services/api'` continue to work

export { API_BASE_URL, setAuthToken, setTokenGetter, authHeaders, getImageUrl, getAvatarUrl } from './client';
export {
  fetchPosts,
  fetchUserPosts,
  fetchPost,
  createPostApi,
  deletePost,
  updatePost,
  fetchFollowingFeed,
  fetchForYouFeed,
  fetchLikedPosts,
  fetchExploreSections,
  fetchExploreSection,
  searchPosts,
  fetchAutocompleteSuggestions,
  recordSearchQuery,
} from './posts';
export type {
  Post,
  PaginatedResponse,
  ExploreCategory,
  ExploreSection,
  ExploreSectionId,
  ExploreSectionsResponse,
  ExploreSectionResponse,
  SearchPostsResponse,
  SearchFilters,
  AutocompleteSuggestion,
  AutocompleteResponse,
  SuggestionType,
} from './posts';
export { fetchRecipe, createRecipe, updateRecipe, deleteRecipe } from './recipes';
export type { Recipe, RecipeInput, RecipeIngredient, RecipeStep } from './recipes';
export { fetchTags, fetchTrendingHashtags, fetchPostsByHashtag, addTagsToPost, removeTagFromPost, fetchPostTags, fetchPostsByTags } from './tags';
export type { Tag, TrendingTag, HashtagPostsResponse } from './tags';
export { fetchMyProfile, updateMyProfile, uploadAvatar, completeOnboarding, checkUsername, fetchMyRole, fetchUserProfile, deleteAccount, searchUsers } from './profiles';
export type { UserProfile, SearchUserResult } from './profiles';
export { likePost, unlikePost } from './likes';
export { fetchComments, createComment, deleteComment } from './comments';
export type { Comment } from './comments';
export { followUser, unfollowUser, checkFollowStatus, fetchFollowStats, cancelFollowRequest, checkFollowRequestStatus, fetchPendingFollowRequests, acceptFollowRequest, denyFollowRequest } from './follows';
export type { FollowRequest } from './follows';
export { savePost, unsavePost, checkSaveStatus, fetchCollections, createCollection, deleteCollection, addPostToCollection, removePostFromCollection, fetchCollectionPosts } from './collections';
export { reportContent } from './reports';
export { checkBlockStatus, checkMuteStatus, blockUser, unblockUser, muteUser, unmuteUser, fetchBlockedUsers, fetchMutedUsers } from './blocks';
export { fetchPreferences, updatePreferences, fetchNotificationPreferences, updateNotificationPreferences } from './preferences';
export type { NotificationPreferences } from './preferences';
export { fetchNotifications, markNotificationRead, markAllNotificationsRead, clearAllNotifications, fetchUnreadNotificationCount, checkExpiringItems } from './notifications';
export type { Notification } from './notifications';
export { fetchAdminUsers, updateUserRole, fetchAdminStats, updateUserVerification } from './admin';
export type { AdminUser, AdminStats } from './admin';
export { fetchPantryItems, createPantryItem, updatePantryItem, deletePantryItem, identifyPantryItems, identifySingleItem, scanReceipt } from './pantry';
export type { PantryItem, PantryItemInput, IdentifiedItem, SingleItemResult } from './pantry';
export { sendChatMessage, fetchChatHistory } from './chat';
export type { ChatMessage } from './chat';
export { trackPostView, markPostNotInterested, removeNotInterestedFeedback, getNotInterestedPosts, resetRecommendations } from './interactions';
export type { ResetRecommendationsResponse } from './interactions';
