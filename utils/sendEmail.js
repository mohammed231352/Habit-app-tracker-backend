const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send an email via SendGrid
 * @param {Object} options - { to, subject, html }
 */
const sendEmail = async ({ to, subject, html }) => {
  const msg = {
    to,
    from: {
      email: process.env.FROM_EMAIL,
      name: 'Habit Tracker',
    },
    subject,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    console.error('SendGrid Error:', error.response?.body?.errors || error.message);
    throw new Error('Email could not be sent. Please try again later.');
  }
};

module.exports = sendEmail;
