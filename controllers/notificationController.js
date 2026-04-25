const Notification = require('../models/Notification');
const NotificationSettings = require('../models/NotificationSettings');
const { sendSystemEmail } = require('../services/emailNotificationService');
const { sendPushNotification } = require('../services/pushNotificationService');

/**
 * Notification Controller
 * Service 4: Notification and Reminder Service
 * Assigned Student: Kareem Taha (234007)
 *
 * 3-Layer Architecture — Controller Layer
 * Handles all HTTP requests for the notification service.
 */

// ─── Helper: default settings object ─────────────────────────────────────────
const defaultSettings = {
  habitRemindersEnabled:    true,
  streakAlertsEnabled:      true,
  emailNotificationsEnabled: true,
  pushNotificationsEnabled: false,
  defaultReminderTime:      '09:00',
  streakMilestones:         [7, 14, 30, 60, 100],
  pushSubscription:         null,
};

// ─── GET /api/notifications ───────────────────────────────────────────────────
/**
 * Get all notifications for the authenticated user (paginated)
 */
const getNotifications = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const filter = { userId: req.user._id };
    if (req.query.type)   filter.type   = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.unread === 'true') filter.isRead = false;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('habitId', 'title'),
      Notification.countDocuments(filter),
    ]);

    const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        unreadCount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
};

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────
/**
 * Mark a single notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    res.json({ success: true, message: 'Notification marked as read.', data: notif });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
};

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────
/**
 * Mark ALL notifications as read for the authenticated user
 */
const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} notification(s) marked as read.`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark notifications as read.' });
  }
};

// ─── DELETE /api/notifications/:id ───────────────────────────────────────────
/**
 * Delete a single notification
 */
const deleteNotification = async (req, res) => {
  try {
    const notif = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!notif) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    res.json({ success: true, message: 'Notification deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete notification.' });
  }
};

// ─── DELETE /api/notifications ───────────────────────────────────────────────
/**
 * Clear all notifications for the authenticated user
 */
const clearAllNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({ userId: req.user._id });
    res.json({
      success: true,
      message: `${result.deletedCount} notification(s) deleted.`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clear notifications.' });
  }
};

// ─── GET /api/notifications/settings ─────────────────────────────────────────
/**
 * Get the authenticated user's notification settings
 * Creates default settings doc if none exists yet
 */
const getSettings = async (req, res) => {
  try {
    let settings = await NotificationSettings.findOne({ userId: req.user._id });

    if (!settings) {
      settings = await NotificationSettings.create({
        userId: req.user._id,
        ...defaultSettings,
      });
    }

    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notification settings.' });
  }
};

// ─── PUT /api/notifications/settings ─────────────────────────────────────────
/**
 * Update the authenticated user's notification settings
 */
const updateSettings = async (req, res) => {
  try {
    const allowed = [
      'habitRemindersEnabled',
      'streakAlertsEnabled',
      'emailNotificationsEnabled',
      'pushNotificationsEnabled',
      'defaultReminderTime',
      'streakMilestones',
      'pushSubscription',
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // Validate reminder time format HH:MM
    if (updates.defaultReminderTime) {
      if (!/^\d{2}:\d{2}$/.test(updates.defaultReminderTime)) {
        return res.status(400).json({
          success: false,
          message: 'defaultReminderTime must be in HH:MM format (e.g. "09:00").',
        });
      }
    }

    const settings = await NotificationSettings.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Notification settings updated.',
      data: settings,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update notification settings.' });
  }
};

// ─── POST /api/notifications/subscribe-push ──────────────────────────────────
/**
 * Save a Web Push subscription object for the user
 */
const subscribePush = async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: 'Invalid push subscription object.' });
    }

    const settings = await NotificationSettings.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          pushSubscription: subscription,
          pushNotificationsEnabled: true,
        },
      },
      { new: true, upsert: true }
    );

    // Send a welcome push to confirm it works
    await sendPushNotification(subscription, {
      title: '🔔 Push Notifications Enabled!',
      body:  'You will now receive real-time habit reminders.',
      url:   '/notifications',
    });

    res.json({ success: true, message: 'Push subscription saved.', data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save push subscription.' });
  }
};

// ─── POST /api/notifications/unsubscribe-push ────────────────────────────────
/**
 * Remove the user's push subscription
 */
const unsubscribePush = async (req, res) => {
  try {
    const settings = await NotificationSettings.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { pushSubscription: null, pushNotificationsEnabled: false } },
      { new: true }
    );

    res.json({ success: true, message: 'Push notifications disabled.', data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove push subscription.' });
  }
};

// ─── POST /api/notifications/test-email ──────────────────────────────────────
/**
 * Send a test email to the authenticated user (useful for demo/testing)
 */
const sendTestEmail = async (req, res) => {
  try {
    await sendSystemEmail({
      to:      req.user.email,
      subject: '✅ Test Email from Habit Tracker',
      heading: '✅ Email Notifications Work!',
      bodyHtml: `
        <p>Hey <strong>${req.user.name}</strong>,</p>
        <p>This is a test email from your Habit Tracker notification service.</p>
        <p>If you received this, your email notifications are configured correctly! 🎉</p>
        <div style="text-align:center;">
          <a class="cta" href="${process.env.CLIENT_URL || 'http://localhost:5173'}/notifications">
            View Notifications →
          </a>
        </div>
      `,
    });

    // Log it
    await Notification.create({
      userId: req.user._id,
      type: 'email',
      title: 'Test Email Sent',
      message: 'A test email was sent to your registered email address.',
      status: 'sent',
      sentAt: new Date(),
    });

    res.json({ success: true, message: 'Test email sent successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to send test email.' });
  }
};

// ─── GET /api/notifications/stats ────────────────────────────────────────────
/**
 * Quick stats for the authenticated user's notifications
 */
const getStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [total, unread, byType, byStatus] = await Promise.all([
      Notification.countDocuments({ userId }),
      Notification.countDocuments({ userId, isRead: false }),
      Notification.aggregate([
        { $match: { userId } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Notification.aggregate([
        { $match: { userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        total,
        unread,
        byType: Object.fromEntries(byType.map((x) => [x._id, x.count])),
        byStatus: Object.fromEntries(byStatus.map((x) => [x._id, x.count])),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notification stats.' });
  }
};

module.exports = {
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
};
