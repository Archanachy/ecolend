// User/profile API calls.
import client from './client';

export function getMyProfile() {
  return client.get('/users/me');
}

export function updateMyProfile(data) {
  return client.patch('/users/me', data);
}

export function getPublicProfile(id) {
  return client.get(`/users/${id}`);
}

export function exportMyData() {
  return client.get('/users/me/export');
}

export function requestAccountDeletion() {
  return client.post('/users/me/delete-request');
}

