// In-app notification routes. All require a session; every handler scopes its
// query to req.userId.
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const notifications = require('../controllers/notification.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', notifications.listNotifications);
router.get('/unread-count', notifications.unreadCount);
// Static path must be declared before the :id route so it isn't shadowed.
router.patch('/read-all', notifications.markAllRead);
router.patch('/:id/read', notifications.markRead);

module.exports = router;
