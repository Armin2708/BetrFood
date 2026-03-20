// Re-export everything for backward compatibility
// Existing imports like `import { fetchPosts } from '../services/api'` continue to work

export { API_BASE_URL, setAuthToken, setTokenGetter, authHeaders, getImageUrl, getAvatarUrl } from './client';
export { fetchPosts, fetchUserPosts, fetchPost, createPostApi, deletePost, updatePost, fetchFollowingFeed } from './posts';
export type { Post, PaginatedResponse } from './posts';
export { fetchRecipe, createRecipe, updateRecipe, deleteRecipe } from './recipes';
export type { Recipe, RecipeInput, RecipeIngredient, RecipeStep } from './recipes';
export { fetchTags, addTagsToPost, removeTagFromPost, fetchPostTags, fetchPostsByTags } from './tags';
export type { Tag } from './tags';
export { fetchMyProfile, updateMyProfile, uploadAvatar, completeOnboarding, checkUsername, fetchMyRole, fetchUserProfile, deleteAccount } from './profiles';
export type { UserProfile } from './profiles';
export { likePost, unlikePost } from './likes';
export { fetchComments, createComment, deleteComment } from './comments';
export type { Comment } from './comments';
export { followUser, unfollowUser, checkFollowStatus, fetchFollowStats } from './follows';
export { savePost, unsavePost, checkSaveStatus, fetchCollections, createCollection, deleteCollection, addPostToCollection, removePostFromCollection, fetchCollectionPosts } from './collections';
export { reportContent } from './reports';
export { checkBlockStatus, checkMuteStatus, blockUser, unblockUser, muteUser, unmuteUser, fetchBlockedUsers, fetchMutedUsers } from './blocks';
export { fetchPreferences, updatePreferences } from './preferences';
export { fetchNotifications, markNotificationRead, markAllNotificationsRead, fetchUnreadNotificationCount } from './notifications';
export type { Notification } from './notifications';
export { fetchAdminUsers, updateUserRole, fetchAdminStats, updateUserVerification } from './admin';
export type { AdminUser, AdminStats } from './admin';
export { fetchPantryItems, createPantryItem, updatePantryItem, deletePantryItem } from './pantry';
export type { PantryItem, PantryItemInput } from './pantry';
export { sendChatMessage, fetchChatHistory } from './chat';
export type { ChatMessage } from './chat';
