import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { fetchWatchlist, addToWatchlistApi, removeFromWatchlistApi, toggleNeoAlertApi } from '@/services/api';

const WatchlistContext = createContext(null);

const WatchlistProvider = ({ children }) => {
  const { session } = useAuth();
  const [watchlistIds, setWatchlistIds] = useState(new Set());  // Set of neo_id strings
  const [watchlistItems, setWatchlistItems] = useState([]);      // raw rows from DB
  const [alertIds, setAlertIds] = useState(new Set());           // Set of neo_id strings with alert on
  const [loading, setLoading] = useState(false);

  // Load watchlist from backend when user is authenticated
  const loadWatchlist = useCallback(async () => {
    if (!session?.access_token) {
      setWatchlistIds(new Set());
      setWatchlistItems([]);
      setAlertIds(new Set());
      return;
    }

    try {
      setLoading(true);
      const data = await fetchWatchlist();
      const items = data?.items || [];
      setWatchlistItems(items);
      setWatchlistIds(new Set(items.map((item) => String(item.neo_id))));
      setAlertIds(new Set(
        items.filter((item) => item.alert_enabled).map((item) => String(item.neo_id))
      ));
    } catch (err) {
      console.error('Failed to load watchlist:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  const isInWatchlist = useCallback(
    (neoId) => watchlistIds.has(String(neoId)),
    [watchlistIds]
  );

  const addToWatchlist = useCallback(
    async (neo) => {
      const neoId = String(neo.id || neo.neo_id);
      const neoName = neo.name || neo.neo_name || neoId;

      // Optimistic update
      setWatchlistIds((prev) => new Set(prev).add(neoId));

      try {
        await addToWatchlistApi(neoId, neoName);
        // Reload to get the full server state
        await loadWatchlist();
      } catch (err) {
        console.error('Failed to add to watchlist:', err);
        // Revert optimistic update
        setWatchlistIds((prev) => {
          const next = new Set(prev);
          next.delete(neoId);
          return next;
        });
        throw err;
      }
    },
    [loadWatchlist]
  );

  const removeFromWatchlist = useCallback(
    async (neoId) => {
      neoId = String(neoId);

      // Optimistic update
      setWatchlistIds((prev) => {
        const next = new Set(prev);
        next.delete(neoId);
        return next;
      });

      try {
        await removeFromWatchlistApi(neoId);
        await loadWatchlist();
      } catch (err) {
        console.error('Failed to remove from watchlist:', err);
        // Revert optimistic update
        setWatchlistIds((prev) => new Set(prev).add(neoId));
        throw err;
      }
    },
    [loadWatchlist]
  );

  const toggleWatchlist = useCallback(
    async (neo) => {
      const neoId = String(neo.id || neo.neo_id);
      if (watchlistIds.has(neoId)) {
        await removeFromWatchlist(neoId);
      } else {
        await addToWatchlist(neo);
      }
    },
    [watchlistIds, addToWatchlist, removeFromWatchlist]
  );

  const hasAlert = useCallback(
    (neoId) => alertIds.has(String(neoId)),
    [alertIds]
  );

  const toggleAlert = useCallback(
    async (neo) => {
      const neoId = String(neo.id || neo.neo_id);

      // Optimistic update
      setAlertIds((prev) => {
        const next = new Set(prev);
        if (next.has(neoId)) {
          next.delete(neoId);
        } else {
          next.add(neoId);
        }
        return next;
      });

      try {
        await toggleNeoAlertApi(neoId);
        await loadWatchlist();
      } catch (err) {
        console.error('Failed to toggle alert:', err);
        // Revert optimistic update
        setAlertIds((prev) => {
          const next = new Set(prev);
          if (next.has(neoId)) {
            next.delete(neoId);
          } else {
            next.add(neoId);
          }
          return next;
        });
        throw err;
      }
    },
    [loadWatchlist]
  );

  const value = useMemo(
    () => ({
      watchlistIds,
      watchlistItems,
      alertIds,
      loading,
      isInWatchlist,
      hasAlert,
      addToWatchlist,
      removeFromWatchlist,
      toggleWatchlist,
      toggleAlert,
      refreshWatchlist: loadWatchlist,
    }),
    [watchlistIds, watchlistItems, alertIds, loading, isInWatchlist, hasAlert, addToWatchlist, removeFromWatchlist, toggleWatchlist, toggleAlert, loadWatchlist]
  );

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
};

const useWatchlist = () => {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error('useWatchlist must be used within WatchlistProvider');
  }
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export { WatchlistProvider, WatchlistContext, useWatchlist };
