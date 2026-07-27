// Saved-listing state (v2). Holds the set of saved listing ids so every heart
// in the app reflects the same truth, and toggling one updates them all.
// Loads once when a user is present; clears on logout.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { listFavoriteIds, addFavorite, removeFavorite } from '../api/favorites';
import { useAuth } from './AuthContext';

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(() => new Set());
  // Mirrors `ids` but is updated synchronously, so back-to-back toggles (a
  // rapid double-click, before React re-renders) still read the true state.
  const idsRef = useRef(ids);

  const commit = useCallback((next) => {
    idsRef.current = next;
    setIds(next);
  }, []);

  useEffect(() => {
    if (!user) {
      commit(new Set());
      return;
    }
    listFavoriteIds()
      .then((res) => commit(new Set(res.data)))
      .catch(() => commit(new Set()));
  }, [user, commit]);

  const isFavorite = useCallback((listingId) => ids.has(String(listingId)), [ids]);

  // Optimistic toggle; reverts if the request fails.
  const toggleFavorite = useCallback(
    async (listingId) => {
      const id = String(listingId);
      // Read + write the ref synchronously so concurrent toggles stay correct.
      const wasSaved = idsRef.current.has(id);
      const optimistic = new Set(idsRef.current);
      if (wasSaved) optimistic.delete(id);
      else optimistic.add(id);
      commit(optimistic);

      try {
        if (wasSaved) await removeFavorite(id);
        else await addFavorite(id);
        return !wasSaved;
      } catch (err) {
        // Revert just this id, preserving any other changes made meanwhile.
        const reverted = new Set(idsRef.current);
        if (wasSaved) reverted.add(id);
        else reverted.delete(id);
        commit(reverted);
        throw err;
      }
    },
    [commit]
  );

  const value = useMemo(
    () => ({ ids, isFavorite, toggleFavorite, count: ids.size }),
    [ids, isFavorite, toggleFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within a FavoritesProvider');
  return ctx;
}
