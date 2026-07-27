// Listing API calls.
import client from './client';

export function browseListings(params) {
  return client.get('/listings', { params });
}

export function getListingAvailability(id) {
  return client.get(`/listings/${id}/availability`);
}

export function getListing(id) {
  return client.get(`/listings/${id}`);
}

export function getMyListings() {
  return client.get('/listings/mine');
}

export function createListing(data) {
  return client.post('/listings', data);
}

export function updateListing(id, data) {
  return client.patch(`/listings/${id}`, data);
}

export function deleteListing(id) {
  return client.delete(`/listings/${id}`);
}
