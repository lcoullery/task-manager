/**
 * Email Service
 *
 * This file handles sending emails:
 * - User invitation emails
 * - Password reset emails (future)
 * - Notification emails (future)
 *
 * Uses nodemailer to send emails via SMTP.
 *
 * Configuration (environment variables):
 * - SMTP_HOST: SMTP server (e.g., smtp.gmail.com)
 * - SMTP_PORT: SMTP port (587 for TLS, 465 for SSL)
 * - SMTP_USER: SMTP username (your email)
 * - SMTP_PASS: SMTP password (or app password)
 * - SMTP_FROM: From email address
 * - APP_NAME: Application name (default: "Task Manager")
 * - APP_URL: Application URL (for links)
 */

const nodemailer = require('nodemailer');

// Get SMTP configuration from environment
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_PORT === '465', // Use SSL for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};

const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@taskmanager.com';
const APP_NAME = process.env.APP_NAME || 'Task Manager';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// Create transporter
let transporter = null;

/**
 * Initialize email transporter
 * Call this once on server startup
 */
function initializeEmailService() {
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  Email service not configured. Invite emails will not be sent.');
    console.warn('   Set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env file.');
    return;
  }

  try {
    transporter = nodemailer.createTransport(SMTP_CONFIG);
    console.log('✓ Email service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize email service:', error.message);
  }
}

/**
 * Check if email service is configured
 * @returns {boolean} True if configured
 */
function isEmailConfigured() {
  return transporter !== null;
}

/**
 * Send user invitation email
 *
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.name - Recipient name
 * @param {string} options.inviteUrl - Invitation URL
 * @param {string} options.invitedBy - Name of admin who sent invite
 * @param {Date} options.expiresAt - Expiration date
 * @returns {Promise<void>}
 */
async function sendInviteEmail({ to, name, inviteUrl, invitedBy, expiresAt }) {
  if (!isEmailConfigured()) {
    throw new Error('Email service not configured');
  }

  // Format expiration date
  const expiresIn = Math.floor((new Date(expiresAt) - new Date()) / (1000 * 60 * 60)); // hours
  const expirationText = expiresIn < 24
    ? `${expiresIn} hours`
    : `${Math.floor(expiresIn / 24)} days`;

  // Email subject
  const subject = `You've been invited to ${APP_NAME}`;

  // HTML email body
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #f9f9f9;
      border-radius: 8px;
      padding: 30px;
      border: 1px solid #e0e0e0;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0;
      font-size: 24px;
    }
    .content {
      background-color: white;
      padding: 25px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: white !important;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 6px;
      font-weight: 500;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 14px;
      margin-top: 20px;
    }
    .expiry-warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 15px 0;
      border-radius: 4px;
      font-size: 14px;
    }
    .link-fallback {
      background-color: #f3f4f6;
      padding: 10px;
      border-radius: 4px;
      word-break: break-all;
      font-size: 12px;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${APP_NAME}</h1>
    </div>

    <div class="content">
      <p>Hi <strong>${name}</strong>,</p>

      <p><strong>${invitedBy}</strong> has invited you to join <strong>${APP_NAME}</strong>.</p>

      <p>Click the button below to set your password and activate your account:</p>

      <center>
        <a href="${inviteUrl}" class="button">Accept Invitation</a>
      </center>

      <div class="expiry-warning">
        ⏰ This invitation expires in <strong>${expirationText}</strong>.
      </div>

      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <div class="link-fallback">
        <a href="${inviteUrl}">${inviteUrl}</a>
      </div>
    </div>

    <div class="footer">
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      <p>This is an automated email from ${APP_NAME}.</p>
    </div>
  </div>
</body>
</html>
  `;

  // Plain text version (fallback)
  const text = `
Hi ${name},

${invitedBy} has invited you to join ${APP_NAME}.

To accept the invitation and set your password, visit this link:
${inviteUrl}

This invitation expires in ${expirationText}.

If you didn't expect this invitation, you can safely ignore this email.

---
${APP_NAME}
${APP_URL}
  `;

  // Send email
  try {
    const info = await transporter.sendMail({
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      text,
      html
    });

    console.log(`✓ Invite email sent to ${to} (Message ID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error(`❌ Failed to send invite email to ${to}:`, error.message);
    throw error;
  }
}

/**
 * Send test email (for debugging SMTP configuration)
 *
 * @param {string} to - Recipient email
 * @returns {Promise<void>}
 */
async function sendTestEmail(to) {
  if (!isEmailConfigured()) {
    throw new Error('Email service not configured');
  }

  const html = `
    <h1>Test Email from ${APP_NAME}</h1>
    <p>Your SMTP configuration is working correctly!</p>
    <p>Sent at: ${new Date().toISOString()}</p>
  `;

  const text = `Test Email from ${APP_NAME}\n\nYour SMTP configuration is working correctly!\nSent at: ${new Date().toISOString()}`;

  try {
    const info = await transporter.sendMail({
      from: `"${APP_NAME}" <${FROM_EMAIL}>`,
      to,
      subject: `Test Email from ${APP_NAME}`,
      text,
      html
    });

    console.log(`✓ Test email sent to ${to} (Message ID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error(`❌ Failed to send test email to ${to}:`, error.message);
    throw error;
  }
}

// Export functions
module.exports = {
  initializeEmailService,
  isEmailConfigured,
  sendInviteEmail,
  sendTestEmail
};
