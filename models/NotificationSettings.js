const mongoose = require('mongoose');

/**
 * NotificationSettings Model
 * Service 4: Notification and Reminder Service
 * Assigned Student: Kareem Taha (234007)
 *
 * Stores each user's personal notification preferences.
 * One document per user (upserted on first access).
 */
const NotificationSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One settings doc per user
    },

    // ─── Global toggles ──────────────────────────────────────────────────────
    habitRemindersEnabled: {
      type: Boolean,
      default: true,
    },
    streakAlertsEnabled: {
      type: Boolean,
      default: true,
    },
    emailNotificationsEnabled: {
      type: Boolean,
      default: true,
    },
    pushNotificationsEnabled: {
      type: Boolean,
      default: false, // requires browser permission
    },

    // ─── Reminder schedule ───────────────────────────────────────────────────
    // Default daily reminder time in "HH:MM" 24-hour format
    defaultReminderTime: {
      type: String,
      default: '09:00',
      match: [/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'],
    },

    // ─── Streak alert thresholds ──────────────────────────────────────────────
    // Alert when streak reaches these milestones (days)
    streakMilestones: {
      type: [Number],
      default: [7, 14, 30, 60, 100],
    },

    // ─── Push subscription payload (Web Push) ────────────────────────────────
    pushSubscription: {
      type: mongoose.Schema.Types.Mixed, // { endpoint, keys: { p256dh, auth } }
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const NotificationSettings = mongoose.model('NotificationSettings', NotificationSettingsSchema);

module.exports = NotificationSettings;
