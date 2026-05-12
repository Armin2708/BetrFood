// Simple event emitter to signal the feed needs a refresh
type Listener = () => void;
const feedListeners = new Set<Listener>();

export const feedEvents = {
  onRefreshNeeded(listener: Listener) {
    feedListeners.add(listener);
    return () => {
      feedListeners.delete(listener);
    };
  },
  emitRefreshNeeded() {
    feedListeners.forEach(l => l());
  },
};

// Event emitter for collection changes (e.g., post removed from collection)
type SaveStatusListener = (postId: string) => void;
const saveStatusListeners = new Set<SaveStatusListener>();

export const collectionEvents = {
  onPostSaveStatusChange(listener: SaveStatusListener) {
    saveStatusListeners.add(listener);
    return () => {
      saveStatusListeners.delete(listener);
    };
  },
  emitPostSaveStatusChange(postId: string) {
    saveStatusListeners.forEach(l => l(postId));
  },
};

// Event emitter for like state changes — updates feed in-place without full reload
type LikeUpdateListener = (postId: string, liked: boolean, likeCount: number) => void;
const likeUpdateListeners = new Set<LikeUpdateListener>();

export const likeEvents = {
  onLikeUpdate(listener: LikeUpdateListener) {
    likeUpdateListeners.add(listener);
    return () => {
      likeUpdateListeners.delete(listener);
    };
  },
  emitLikeUpdate(postId: string, liked: boolean, likeCount: number) {
    likeUpdateListeners.forEach(l => l(postId, liked, likeCount));
  },
};
