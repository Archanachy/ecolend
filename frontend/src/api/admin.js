// Admin API calls.
import client from './client';

export const getOverview = () => client.get('/admin/overview');
export const listUsers = (params) => client.get('/admin/users', { params });
export const suspendUser = (id, suspend) => client.patch(`/admin/users/${id}/suspend`, { suspend });
export const listLogs = (params) => client.get('/admin/logs', { params });
export const listAlerts = (params) => client.get('/admin/alerts', { params });
export const acknowledgeAlert = (id) => client.patch(`/admin/alerts/${id}/acknowledge`);
export const removeListing = (id) => client.patch(`/admin/listings/${id}/remove`);
export const listAdminReviews = (params) => client.get('/admin/reviews', { params });
export const removeReview = (id) => client.delete(`/admin/reviews/${id}`);
export const listAdminBookings = (params) => client.get('/admin/bookings', { params });
export const resolveDispute = (id, outcome) => client.patch(`/admin/bookings/${id}/resolve`, { outcome });
