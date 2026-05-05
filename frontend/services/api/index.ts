// Re-export everything for backward compatibility

export { API_BASE_URL, setAuthToken, setTokenGetter, authHeaders, getImageUrl, getAvatarUrl } from './client';
export {
  fetchPosts,
  fetchPosts as fetchForYouFeed,
  fetchUserPosts,
  fetchPost,
  createPostApi,
  deletePost,
  updatePost,
  fetchFollowingFeed,
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
export {
  fetchTags,
  fetchTags as fetchTrendingHashtags,
  addTagsToPost,
  removeTagFromPost,
  fetchPostTags,
  fetchPostsByTags,
} from './tags';
export type { Tag } from './tags';
export {
  fetchMyProfile,
  updateMyProfile,
  uploadAvatar,
  completeOnboarding,
  checkUsername,
  fetchMyRole,
  fetchUserProfile,
  deleteAccount,
  searchUsers,
  requestDataExport,
} from './profiles';
export type { UserProfile, SearchUserResult, DataExportResult } from './profiles';
export { likePost, unlikePost } from './likes';
export { fetchComments, createComment, deleteComment } from './comments';
export type { Comment } from './comments';
export { followUser, unfollowUser, checkFollowStatus, fetchFollowStats, cancelFollowRequest, checkFollowRequestStatus, fetchPendingFollowRequests, acceptFollowRequest, denyFollowRequest } from './follows';
export type { FollowRequest } from './follows';
export { savePost, unsavePost, checkSaveStatus, fetchCollections, createCollection, deleteCollection, addPostToCollection, removePostFromCollection, fetchCollectionPosts } from './collections';
export { reportContent } from './reports';
export { submitSupportTicket } from './support';
export type { SubmitSupportTicketInput, SupportTicket } from './support';
export { checkBlockStatus, checkMuteStatus, blockUser, unblockUser, muteUser, unmuteUser, fetchBlockedUsers, fetchMutedUsers } from './blocks';
export { fetchPreferences, updatePreferences } from './preferences';
export { fetchNotifications, markNotificationRead, markAllNotificationsRead, clearAllNotifications, fetchUnreadNotificationCount, checkExpiringItems } from './notifications';
export type { Notification } from './notifications';
export { fetchAdminUsers, updateUserRole, fetchAdminStats, updateUserVerification } from './admin';
export type { AdminUser, AdminStats } from './admin';
export { fetchPantryItems, createPantryItem, updatePantryItem, deletePantryItem, identifyPantryItems, identifySingleItem, scanReceipt } from './pantry';
export type { PantryItem, PantryItemInput, IdentifiedItem, SingleItemResult } from './pantry';
export { sendChatMessage, fetchChatHistory } from './chat';
export type { ChatMessage } from './chat';
export { trackPostView, markPostNotInterested, removeNotInterestedFeedback, getNotInterestedPosts } from './interactions';
export { fetchFaq, recordFaqView } from './faq';
export type { FaqCategory, FaqItem } from './faq';
