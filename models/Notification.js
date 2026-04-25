const mongoose = require('mongoose');

/**
 * Notification Model
 * Service 4: Notification and Reminder Service
 * Assigned Student: Kareem Taha (234007)
 *
 * Stores all notification records in MongoDB.
 */
const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // ─── Type ──────────────────────────────────────────────────────────────────
    type: {
      type: String,
      enum: [
        'habit_reminder',   // Scheduled habit reminder
        'streak_alert',     // Streak danger / milestone
        'email',            // System email (password reset, account update)
        'push',             // Browser / mobile push notification
      ],
      required: true,
    },

    // ─── Content ────────────────────────────────────────────────────────────
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },

    // ─── Status ─────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
    },
    isRead: {
      type: Boolean,
      default: false,
    },

    // ─── Related habit (optional) ────────────────────────────────────────────
    habitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Habit',
      default: null,
    },

    // ─── Scheduling ─────────────────────────────────────────────────────────
    scheduledAt: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },

    // ─── Error info (for failed notifications) ───────────────────────────────
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficiently querying unsent scheduled notifications (used by cron)
NotificationSchema.index({ status: 1, scheduledAt: 1 });

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;
