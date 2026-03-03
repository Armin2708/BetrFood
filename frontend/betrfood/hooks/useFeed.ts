import { useState, useCallback, useRef } from 'react';
import { fetchPosts, Post } from '../services/api';
const LIMIT = 10;
export function useFeed() {
  const [posts, setPosts] = useState<Post[]>([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [loadingMore, setLoadingMore] = useState(false); const [error, setError] = useState<string | null>(null); const [hasMore, setHasMore] = useState(true); const cursorRef = useRef<string | null>(null);
  const fetchInitial = useCallback(async () => { setLoading(true); setError(null); try { const d = await fetchPosts(null, LIMIT); setPosts(d.posts); cursorRef.current = d.nextCursor; setHasMore(d.hasMore); } catch (e: any) { setError(e.message); } finally { setLoading(false); } }, []);
  const fetchMore = useCallback(async () => { if (loadingMore || !hasMore || !cursorRef.current) return; setLoadingMore(true); try { const d = await fetchPosts(cursorRef.current, LIMIT); setPosts(p => [...p, ...d.posts]); cursorRef.current = d.nextCursor; setHasMore(d.hasMore); } catch (e: any) { setError(e.message); } finally { setLoadingMore(false); } }, [loadingMore, hasMore]);
  const refresh = useCallback(async () => { setRefreshing(true); setError(null); try { const d = await fetchPosts(null, LIMIT); setPosts(d.posts); cursorRef.current = d.nextCursor; setHasMore(d.hasMore); } catch (e: any) { setError(e.message); } finally { setRefreshing(false); } }, []);
  const removePost = useCallback((id: string) => { setPosts(p => p.filter(x => x.id !== id)); }, []);
  return { posts, loading, refreshing, loadingMore, error, hasMore, fetchInitial, fetchMore, refresh, removePost };
}
