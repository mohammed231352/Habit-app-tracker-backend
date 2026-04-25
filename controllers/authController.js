const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// ─── Helper: Generate JWT ──────────────────────────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// ─── @route   POST /api/auth/register ─────────────────────────────────────────
// ─── @desc    Register a new user ─────────────────────────────────────────────
// ─── @access  Public ──────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Create user (password will be hashed by pre-save hook)
    const user = await User.create({ name, email, password });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── @route   POST /api/auth/login ────────────────────────────────────────────
// ─── @desc    Login user and return JWT ───────────────────────────────────────
// ─── @access  Public ──────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Find user and also retrieve password (select: false in schema)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Compare passwords
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── @route   POST /api/auth/forgot-password ──────────────────────────────────
// ─── @desc    Send password reset email ───────────────────────────────────────
// ─── @access  Public ──────────────────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return 200 to prevent email enumeration attacks
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    // Generate reset token (plain text returned, hashed stored in DB)
    const resetToken = user.generateResetToken();
    await user.save({ validateBeforeSave: false });

    // Build reset URL
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // HTML email template
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f1a; color: #e0e0e0; margin: 0; padding: 20px; }
            .container { max-width: 560px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; padding: 40px; border: 1px solid #2a2a4a; }
            h2 { color: #7c3aed; font-size: 24px; margin-bottom: 16px; }
            p { color: #b0b0c0; line-height: 1.6; margin-bottom: 16px; }
            .btn { display: inline-block; background: linear-gradient(135deg, #7c3aed, #2563eb); color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
            .note { font-size: 13px; color: #6b7280; border-top: 1px solid #2a2a4a; padding-top: 16px; margin-top: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>🔐 Password Reset Request</h2>
            <p>Hi <strong>${user.name}</strong>,</p>
            <p>We received a request to reset your Habit Tracker account password. Click the button below to set a new password:</p>
            <a href="${resetUrl}" class="btn">Reset My Password</a>
            <p>Or copy this link into your browser:</p>
            <p style="word-break: break-all; color: #7c3aed;">${resetUrl}</p>
            <div class="note">
              <p>⏱ This link will expire in <strong>15 minutes</strong>.</p>
              <p>If you did not request a password reset, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Habit Tracker — Password Reset Request',
        html,
      });

      res.json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    } catch (emailError) {
      // Rollback token if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return next(new Error('Email could not be sent. Please try again later.'));
    }
  } catch (error) {
    next(error);
  }
};

// ─── @route   POST /api/auth/reset-password ───────────────────────────────────
// ─── @desc    Reset password using token ──────────────────────────────────────
// ─── @access  Public ──────────────────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    // Hash the incoming plain token to compare with stored hashed token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid (non-expired) reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired.',
      });
    }

    // Update password (pre-save hook will hash it)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Return new JWT so user is automatically logged in
    const jwtToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password has been reset successfully.',
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, forgotPassword, resetPassword };
