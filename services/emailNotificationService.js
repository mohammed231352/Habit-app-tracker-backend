const sendEmail = require('../utils/sendEmail');

/**
 * Email Notification Service
 * Service 4: Notification and Reminder Service
 * Assigned Student: Kareem Taha (234007)
 *
 * Handles all outbound email types:
 *  - Habit reminder emails
 *  - Streak alert emails (danger + milestone)
 *  - System emails (password reset, account updates, announcements)
 */

// ─── Shared HTML wrapper ───────────────────────────────────────────────────────
const wrapHtml = (body) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Habit Tracker</title>
  <style>
    body { margin:0; padding:0; background:#0b0b18; font-family:'Segoe UI',Arial,sans-serif; color:#f0f0ff; }
    .container { max-width:560px; margin:32px auto; background:#161630; border:1px solid #252545; border-radius:16px; overflow:hidden; }
    .header { background:linear-gradient(135deg,#7c3aed 0%,#2563eb 100%); padding:32px 40px; text-align:center; }
    .header h1 { margin:0; font-size:24px; color:#fff; letter-spacing:-0.02em; }
    .header p  { margin:8px 0 0; font-size:14px; color:rgba(255,255,255,0.7); }
    .body   { padding:32px 40px; }
    .body p { font-size:15px; line-height:1.7; color:#a0a0c0; margin:0 0 16px; }
    .body strong { color:#f0f0ff; }
    .cta    { display:inline-block; margin:8px 0 24px; padding:14px 32px; background:linear-gradient(135deg,#7c3aed 0%,#2563eb 100%); color:#fff !important; font-weight:700; font-size:15px; border-radius:10px; text-decoration:none; }
    .badge  { display:inline-block; padding:6px 16px; background:rgba(255,216,90,0.12); border:1px solid rgba(255,216,90,0.28); border-radius:999px; color:#ffd85a; font-weight:700; font-size:14px; }
    .footer { padding:24px 40px; border-top:1px solid #252545; text-align:center; font-size:12px; color:#6b6b90; }
  </style>
</head>
<body>
  <div class="container">
    ${body}
    <div class="footer">
      You're receiving this email from <strong>Habit Tracker</strong>.<br/>
      You can manage your notification preferences in your account settings.
    </div>
  </div>
</body>
</html>
`;

// ─── 1. Habit Reminder Email ──────────────────────────────────────────────────
/**
 * @param {string} to          - Recipient email
 * @param {string} userName    - Recipient's display name
 * @param {string} habitTitle  - Name of the habit
 * @param {string} clientUrl   - Frontend base URL
 */
const sendHabitReminderEmail = async ({ to, userName, habitTitle, clientUrl }) => {
  const html = wrapHtml(`
    <div class="header">
      <h1>⏰ Time for Your Habit!</h1>
      <p>Your scheduled reminder</p>
    </div>
    <div class="body">
      <p>Hey <strong>${userName}</strong>,</p>
      <p>This is your friendly reminder to complete your habit today:</p>
      <p style="text-align:center;font-size:20px;font-weight:700;color:#f0f0ff;margin:24px 0;">"${habitTitle}"</p>
      <p>Staying consistent is the key to building lasting habits. You've got this! 💪</p>
      <div style="text-align:center;">
        <a class="cta" href="${clientUrl}/habits">Complete Your Habit →</a>
      </div>
      <p style="font-size:13px;color:#6b6b90;">Keep going — every check-in counts toward your streak!</p>
    </div>
  `);

  await sendEmail({ to, subject: `⏰ Reminder: Complete "${habitTitle}" Today`, html });
};

// ─── 2. Streak Danger Alert Email ────────────────────────────────────────────
/**
 * @param {string} to          - Recipient email
 * @param {string} userName    - Recipient's name
 * @param {string} habitTitle  - Habit name
 * @param {number} streak      - Current streak count
 * @param {string} clientUrl   - Frontend base URL
 */
const sendStreakDangerEmail = async ({ to, userName, habitTitle, streak, clientUrl }) => {
  const html = wrapHtml(`
    <div class="header">
      <h1>🔥 Your Streak is in Danger!</h1>
      <p>Don't let it break today</p>
    </div>
    <div class="body">
      <p>Hey <strong>${userName}</strong>,</p>
      <p>You're at risk of breaking your <span class="badge">🔥 ${streak}-day streak</span> on <strong>"${habitTitle}"</strong>.</p>
      <p>You haven't completed this habit yet today. Don't let all that hard work go to waste — take just a moment to check it off!</p>
      <div style="text-align:center;">
        <a class="cta" href="${clientUrl}/habits">Save My Streak →</a>
      </div>
      <p style="font-size:13px;color:#6b6b90;">Miss today and the streak resets to 0. You can do it!</p>
    </div>
  `);

  await sendEmail({ to, subject: `🔥 Streak Alert: Don't Break Your ${streak}-Day Streak!`, html });
};

// ─── 3. Streak Milestone Email ────────────────────────────────────────────────
/**
 * @param {string} to          - Recipient email
 * @param {string} userName    - Recipient's name
 * @param {string} habitTitle  - Habit name
 * @param {number} streak      - Milestone reached (e.g. 7, 30, 100)
 * @param {string} clientUrl   - Frontend base URL
 */
const sendStreakMilestoneEmail = async ({ to, userName, habitTitle, streak, clientUrl }) => {
  const emoji = streak >= 100 ? '🏆' : streak >= 30 ? '⭐' : '🎉';
  const html = wrapHtml(`
    <div class="header">
      <h1>${emoji} ${streak}-Day Milestone!</h1>
      <p>Congratulations on your achievement</p>
    </div>
    <div class="body">
      <p>Hey <strong>${userName}</strong>,</p>
      <p>You just hit a massive milestone! 🎊</p>
      <p style="text-align:center;font-size:40px;margin:16px 0;">${emoji}</p>
      <p style="text-align:center;">You've completed <strong>"${habitTitle}"</strong> for<br/>
        <span class="badge" style="font-size:22px;padding:10px 28px;margin-top:8px;">${streak} Days in a Row!</span>
      </p>
      <p>This is an incredible achievement. Your consistency is truly inspiring — keep it up!</p>
      <div style="text-align:center;">
        <a class="cta" href="${clientUrl}/dashboard">View My Dashboard →</a>
      </div>
    </div>
  `);

  await sendEmail({ to, subject: `${emoji} You hit a ${streak}-Day Streak on "${habitTitle}"!`, html });
};

// ─── 4. System Email (password reset / account update / announcement) ─────────
/**
 * @param {string} to       - Recipient email
 * @param {string} subject  - Email subject
 * @param {string} heading  - Bold heading text inside email
 * @param {string} bodyHtml - Raw inner HTML body to inject
 */
const sendSystemEmail = async ({ to, subject, heading, bodyHtml }) => {
  const html = wrapHtml(`
    <div class="header">
      <h1>${heading}</h1>
      <p>Habit Tracker System Notification</p>
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
  `);

  await sendEmail({ to, subject, html });
};

module.exports = {
  sendHabitReminderEmail,
  sendStreakDangerEmail,
  sendStreakMilestoneEmail,
  sendSystemEmail,
};
