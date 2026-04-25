const cron = require('node-cron');
const User = require('../models/User');
const Habit = require('../models/Habit');
const Notification = require('../models/Notification');
const NotificationSettings = require('../models/NotificationSettings');
const { sendHabitReminderEmail, sendStreakDangerEmail, sendStreakMilestoneEmail } = require('./emailNotificationService');
const { sendHabitReminderPush, sendStreakDangerPush, sendStreakMilestonePush } = require('./pushNotificationService');

/**
 * Cron / Scheduler Service
 * Service 4: Notification and Reminder Service
 * Assigned Student: Kareem Taha (234007)
 *
 * Runs background jobs every minute to:
 *  1. Send scheduled habit reminder notifications
 *  2. Send streak danger alerts (end-of-day losers)
 *  3. Send streak milestone celebrations
 */

// ─── Helper: compute current streak for a habit ──────────────────────────────
const computeStreak = (completedDates) => {
  if (!completedDates || completedDates.length === 0) return 0;

  const sorted = completedDates
    .map((d) => new Date(d).toDateString())
    .filter((v, i, a) => a.indexOf(v) === i) // unique dates
    .sort((a, b) => new Date(b) - new Date(a)); // descending

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 0;
  let expected = sorted[0] === today ? today : yesterday;

  for (const dateStr of sorted) {
    if (dateStr === expected) {
      streak++;
      const d = new Date(expected);
      d.setDate(d.getDate() - 1);
      expected = d.toDateString();
    } else {
      break;
    }
  }
  return streak;
};

// ─── Helper: was habit completed today ──────────────────────────────────────
const completedToday = (completedDates) => {
  const today = new Date().toDateString();
  return completedDates.some((d) => new Date(d).toDateString() === today);
};

// ─── Helper: was a notification already sent today (debounce) ───────────────
const alreadySentToday = async (userId, habitId, type) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const existing = await Notification.findOne({
    userId,
    habitId,
    type,
    createdAt: { $gte: startOfDay },
    status: { $in: ['sent', 'pending'] },
  });
  return !!existing;
};

// ─── JOB 1: Scheduled Habit Reminders ────────────────────────────────────────
// Runs every minute, checks if the current time matches a user's reminder time
const runHabitReminderJob = async () => {
  try {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hh}:${mm}`;

    // Find all users whose reminder time matches right now
    const settingsList = await NotificationSettings.find({
      habitRemindersEnabled: true,
      defaultReminderTime: currentTime,
    });

    if (settingsList.length === 0) return;

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    for (const settings of settingsList) {
      const user = await User.findById(settings.userId).select('name email');
      if (!user) continue;

      const habits = await Habit.find({ userId: settings.userId });
      if (!habits.length) continue;

      for (const habit of habits) {
        // Skip if already completed today
        if (completedToday(habit.completedDates)) continue;

        // Skip if we already sent a reminder for this habit today
        if (await alreadySentToday(settings.userId, habit._id, 'habit_reminder')) continue;

        // Create notification record
        const notif = await Notification.create({
          userId: settings.userId,
          habitId: habit._id,
          type: 'habit_reminder',
          title: 'Habit Reminder',
          message: `Time to complete: "${habit.title}"`,
          status: 'pending',
          scheduledAt: now,
        });

        try {
          // Send email
          if (settings.emailNotificationsEnabled) {
            await sendHabitReminderEmail({
              to: user.email,
              userName: user.name,
              habitTitle: habit.title,
              clientUrl,
            });
          }

          // Send push notification
          if (settings.pushNotificationsEnabled && settings.pushSubscription) {
            await sendHabitReminderPush(settings.pushSubscription, habit.title);
          }

          notif.status = 'sent';
          notif.sentAt = new Date();
        } catch (err) {
          notif.status = 'failed';
          notif.errorMessage = err.message;
          console.error(`❌ Reminder failed for ${user.email} — ${habit.title}: ${err.message}`);
        }

        await notif.save();
      }
    }
  } catch (err) {
    console.error('❌ Habit Reminder Job error:', err.message);
  }
};

// ─── JOB 2: Streak Alerts ─────────────────────────────────────────────────────
// Runs once daily at 20:00 (8 PM) — danger alerts for today's incomplete habits
const runStreakAlertJob = async () => {
  try {
    const allSettings = await NotificationSettings.find({ streakAlertsEnabled: true });
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    for (const settings of allSettings) {
      const user = await User.findById(settings.userId).select('name email');
      if (!user) continue;

      const habits = await Habit.find({ userId: settings.userId });

      for (const habit of habits) {
        const streak = computeStreak(habit.completedDates);
        if (streak === 0) continue;                        // No streak to protect
        if (completedToday(habit.completedDates)) continue; // Already done today

        // ── Streak Danger Alert ──────────────────────────────────────────────
        if (await alreadySentToday(settings.userId, habit._id, 'streak_alert')) continue;

        const notif = await Notification.create({
          userId: settings.userId,
          habitId: habit._id,
          type: 'streak_alert',
          title: '🔥 Streak in Danger!',
          message: `Your ${streak}-day streak on "${habit.title}" will reset if you don't complete it today!`,
          status: 'pending',
          scheduledAt: new Date(),
        });

        try {
          if (settings.emailNotificationsEnabled) {
            await sendStreakDangerEmail({
              to: user.email,
              userName: user.name,
              habitTitle: habit.title,
              streak,
              clientUrl,
            });
          }
          if (settings.pushNotificationsEnabled && settings.pushSubscription) {
            await sendStreakDangerPush(settings.pushSubscription, { habitTitle: habit.title, streak });
          }

          notif.status = 'sent';
          notif.sentAt = new Date();
        } catch (err) {
          notif.status = 'failed';
          notif.errorMessage = err.message;
        }

        await notif.save();
      }
    }
  } catch (err) {
    console.error('❌ Streak Alert Job error:', err.message);
  }
};

// ─── JOB 3: Streak Milestone Celebrations ─────────────────────────────────────
// Runs once daily after midnight — checks if anyone hit a milestone yesterday
const runStreakMilestoneJob = async () => {
  try {
    const allSettings = await NotificationSettings.find({ streakAlertsEnabled: true });
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    for (const settings of allSettings) {
      const user = await User.findById(settings.userId).select('name email');
      if (!user) continue;

      const milestones = settings.streakMilestones || [7, 14, 30, 60, 100];
      const habits = await Habit.find({ userId: settings.userId });

      for (const habit of habits) {
        const streak = computeStreak(habit.completedDates);
        if (!milestones.includes(streak)) continue;

        const alreadySent = await alreadySentToday(settings.userId, habit._id, 'streak_alert');
        if (alreadySent) continue;

        const notif = await Notification.create({
          userId: settings.userId,
          habitId: habit._id,
          type: 'streak_alert',
          title: `🎉 ${streak}-Day Streak Milestone!`,
          message: `Incredible! You've hit a ${streak}-day streak on "${habit.title}"!`,
          status: 'pending',
          scheduledAt: new Date(),
        });

        try {
          if (settings.emailNotificationsEnabled) {
            await sendStreakMilestoneEmail({
              to: user.email,
              userName: user.name,
              habitTitle: habit.title,
              streak,
              clientUrl,
            });
          }
          if (settings.pushNotificationsEnabled && settings.pushSubscription) {
            await sendStreakMilestonePush(settings.pushSubscription, { habitTitle: habit.title, streak });
          }

          notif.status = 'sent';
          notif.sentAt = new Date();
        } catch (err) {
          notif.status = 'failed';
          notif.errorMessage = err.message;
        }

        await notif.save();
      }
    }
  } catch (err) {
    console.error('❌ Streak Milestone Job error:', err.message);
  }
};

// ─── Start all cron jobs ──────────────────────────────────────────────────────
const startScheduler = () => {
  // Job 1: Every minute — check if any user's reminder time matches now
  cron.schedule('* * * * *', () => {
    runHabitReminderJob();
  });

  // Job 2: Every day at 20:00 — streak danger alerts
  cron.schedule('0 20 * * *', () => {
    console.log('⏰ Running Streak Danger Alert job...');
    runStreakAlertJob();
  });

  // Job 3: Every day at 00:05 — streak milestone celebrations
  cron.schedule('5 0 * * *', () => {
    console.log('⏰ Running Streak Milestone job...');
    runStreakMilestoneJob();
  });

  console.log('✅ Notification Scheduler started (cron jobs active)');
};

module.exports = { startScheduler, runHabitReminderJob, runStreakAlertJob, runStreakMilestoneJob };
