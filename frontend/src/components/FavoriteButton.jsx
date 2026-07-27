// Heart toggle for saving a listing. Guests are sent to log in. Because the
// button often sits inside a card that is itself a link, the click is stopped
// from bubbling.
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { useToast } from '../context/ToastContext';

export default function FavoriteButton({ listingId, className = '' }) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const toast = useToast();
  const navigate = useNavigate();
  const saved = isFavorite(listingId);

  async function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const nowSaved = await toggleFavorite(listingId);
      toast.success(nowSaved ? 'Saved to your list.' : 'Removed from your list.');
    } catch {
      toast.error('Could not update your saved listings.');
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`fav-btn ${saved ? 'is-saved' : ''} ${className}`}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved listings' : 'Save this listing'}
      title={saved ? 'Saved' : 'Save'}
    >
      {saved ? '♥' : '♡'}
    </button>
  );
}
