// Booking API calls.
import client from './client';

export function createBooking(data) {
  return client.post('/bookings', data);
}

export function getBooking(id) {
  return client.get(`/bookings/${id}`);
}

export function getMyBookings() {
  return client.get('/bookings/mine');
}

export function getBookingRequests() {
  return client.get('/bookings/requests');
}

export function getEarnings() {
  return client.get('/bookings/earnings');
}

export function changeBookingStatus(id, action) {
  return client.patch(`/bookings/${id}/status`, { action });
}

export function addBookingComment(id, body) {
  return client.post(`/bookings/${id}/comments`, { body });
}

export function initiatePayment(id) {
  return client.post(`/bookings/${id}/pay`);
}
