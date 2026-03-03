import { useState, useCallback, useRef } from 'react';
import { fetchPosts, Post } from '../services/api';

const LIMIT = 10;

export function useFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<string | null>(null);

  const fetchInitial = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchPosts(null, LIMIT);
      setPosts(data.posts); cursorRef.current = data.nextCursor; setHasMore(data.hasMore);
    } catch (err: any) { setError(err.message || 'Something went wrong'); }
    finally { setLoading(false); }
  }, []);

  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursorRef.current) return;
    setLoadingMore(true);
    try {
      const data = await fetchPosts(cursorRef.current, LIMIT);
      setPosts(prev => [...prev, ...data.posts]); cursorRef.current = data.nextCursor; setHasMore(data.hasMore);
    } catch (err: any) { setError(err.message || 'Failed to load more'); }
    finally { setLoadingMore(false); }
  }, [loadingMore, hasMore]);

  const refresh = useCallback(async () => {
    setRefreshing(true); setError(null);
    try {
      const data = await fetchPosts(null, LIMIT);
      setPosts(data.posts); cursorRef.current = data.nextCursor; setHasMore(data.hasMore);
    } catch (err: any) { setError(err.message || 'Failed to refresh'); }
    finally { setRefreshing(false); }
  }, []);

  const removePost = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  return { posts, loading, refreshing, loadingMore, error, hasMore, fetchInitial, fetchMore, refresh, removePost };
}
