const webpush = require('web-push');

/**
 * Push Notification Service (Web Push / VAPID)
 * Service 4: Notification and Reminder Service
 * Assigned Student: Kareem Taha (234007)
 *
 * Sends browser push notifications using the Web Push Protocol.
 * Requires VAPID keys (see .env).
 */

// ─── Configure VAPID keys ──────────────────────────────────────────────────────
// Generate keys once with: npx web-push generate-vapid-keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.FROM_EMAIL || 'admin@habittracker.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Send a push notification to a single subscriber.
 * @param {Object} subscription  - Web Push subscription object { endpoint, keys: { p256dh, auth } }
 * @param {Object} payload       - { title, body, icon?, url? }
 * @returns {boolean}            - true if sent successfully, false on failure
 */
const sendPushNotification = async (subscription, payload) => {
  if (!subscription || !subscription.endpoint) {
    console.warn('⚠️  Push: No valid subscription provided.');
    return false;
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('⚠️  Push: VAPID keys not configured. Skipping push notification.');
    return false;
  }

  const notificationPayload = JSON.stringify({
    title: payload.title || 'Habit Tracker',
    body:  payload.body  || '',
    icon:  payload.icon  || '/icon-192.png',
    badge: '/badge-72.png',
    url:   payload.url   || '/',
    timestamp: Date.now(),
  });

  try {
    await webpush.sendNotification(subscription, notificationPayload);
    console.log(`📲 Push sent to endpoint: ${subscription.endpoint.substring(0, 40)}...`);
    return true;
  } catch (error) {
    // 410 Gone = subscription expired/revoked — caller should remove it
    if (error.statusCode === 410) {
      console.warn('📲 Push: Subscription expired (410). Should be removed from DB.');
    } else {
      console.error('📲 Push Error:', error.message);
    }
    return false;
  }
};

/**
 * Send a habit reminder push notification
 */
const sendHabitReminderPush = (subscription, habitTitle) =>
  sendPushNotification(subscription, {
    title: '⏰ Habit Reminder',
    body:  `Time to complete: "${habitTitle}"`,
    url:   '/habits',
  });

/**
 * Send a streak danger push notification
 */
const sendStreakDangerPush = (subscription, { habitTitle, streak }) =>
  sendPushNotification(subscription, {
    title: '🔥 Streak in Danger!',
    body:  `Don't break your ${streak}-day streak on "${habitTitle}"!`,
    url:   '/habits',
  });

/**
 * Send a streak milestone push notification
 */
const sendStreakMilestonePush = (subscription, { habitTitle, streak }) =>
  sendPushNotification(subscription, {
    title: `🎉 ${streak}-Day Streak!`,
    body:  `Amazing! You hit ${streak} days on "${habitTitle}"!`,
    url:   '/dashboard',
  });

module.exports = {
  sendPushNotification,
  sendHabitReminderPush,
  sendStreakDangerPush,
  sendStreakMilestonePush,
};
