// Review API calls.
import client from './client';

export function createReview(data) {
  return client.post('/reviews', data);
}

// Accepts either a bare userId (reviews about that user) or a params object
// such as { bookingId } (both sides of one booking).
export function listReviews(query) {
  const params = typeof query === 'string' ? { userId: query } : query || {};
  return client.get('/reviews', { params });
}
