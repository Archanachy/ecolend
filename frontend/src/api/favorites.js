// Saved-listing (favorites) API calls.
import client from './client';

export function listFavorites() {
  return client.get('/favorites');
}

export function listFavoriteIds() {
  return client.get('/favorites/ids');
}

export function addFavorite(listingId) {
  return client.post(`/favorites/${listingId}`);
}

export function removeFavorite(listingId) {
  return client.delete(`/favorites/${listingId}`);
}
