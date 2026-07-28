// In-app notification API calls.
import client from './client';

export function listNotifications(limit) {
  return client.get('/notifications', { params: limit ? { limit } : {} });
}

export function getUnreadCount() {
  return client.get('/notifications/unread-count');
}

export function markNotificationRead(id) {
  return client.patch(`/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return client.patch('/notifications/read-all');
}
