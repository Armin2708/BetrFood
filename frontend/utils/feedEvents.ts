// Simple event emitter to signal the feed needs a refresh
type Listener = () => void;
const listeners = new Set<Listener>();

export const feedEvents = {
  onRefreshNeeded(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  emitRefreshNeeded() {
    listeners.forEach(l => l());
  },
};
