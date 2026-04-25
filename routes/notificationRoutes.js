const express = require('express');
const { protectRoute } = require('../middleware/authMiddleware');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getSettings,
  updateSettings,
  subscribePush,
  unsubscribePush,
  sendTestEmail,
  getStats,
} = require('../controllers/notificationController');

/**
 * Notification Routes
 * Service 4: Notification and Reminder Service
 * Assigned Student: Kareem Taha (234007)
 *
 * All routes require authentication (JWT via protectRoute middleware).
 *
 * Base: /api/notifications
 */

const router = express.Router();

// All notification routes are protected
router.use(protectRoute);

// ─── Notification CRUD ────────────────────────────────────────────────────────
router.get('/',              getNotifications);       // GET  /api/notifications
router.delete('/',           clearAllNotifications);  // DELETE /api/notifications (clear all)
router.patch('/:id/read',    markAsRead);             // PATCH /api/notifications/:id/read
router.patch('/read-all',    markAllAsRead);          // PATCH /api/notifications/read-all
router.delete('/:id',        deleteNotification);     // DELETE /api/notifications/:id

// ─── Settings ─────────────────────────────────────────────────────────────────
router.get('/settings',      getSettings);            // GET  /api/notifications/settings
router.put('/settings',      updateSettings);         // PUT  /api/notifications/settings

// ─── Push Subscription ───────────────────────────────────────────────────────
router.post('/subscribe-push',   subscribePush);      // POST /api/notifications/subscribe-push
router.post('/unsubscribe-push', unsubscribePush);    // POST /api/notifications/unsubscribe-push

// ─── Utility ─────────────────────────────────────────────────────────────────
router.post('/test-email',   sendTestEmail);          // POST /api/notifications/test-email
router.get('/stats',         getStats);               // GET  /api/notifications/stats

module.exports = router;
