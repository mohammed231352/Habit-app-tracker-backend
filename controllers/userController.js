const { validationResult } = require('express-validator');
const User = require('../models/User');

// ─── @route   GET /api/user/profile ───────────────────────────────────────────
// ─── @desc    Get logged-in user's profile ────────────────────────────────────
// ─── @access  Private (JWT required) ──────────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    // req.user is already populated by protectRoute middleware
    const user = req.user;

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── @route   PUT /api/user/profile ───────────────────────────────────────────
// ─── @desc    Update logged-in user's profile ─────────────────────────────────
// ─── @access  Private (JWT required) ──────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const { name, email, currentPassword, newPassword } = req.body;

    // Fetch user WITH password for potential password update
    const user = await User.findById(req.user._id).select('+password');

    // ── Update name ────────────────────────────────────────────────────────────
    if (name) {
      if (name.length < 2 || name.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Name must be between 2 and 50 characters.',
        });
      }
      user.name = name.trim();
    }

    // ── Update email ───────────────────────────────────────────────────────────
    if (email && email.toLowerCase() !== user.email) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: 'This email is already in use by another account.',
        });
      }
      user.email = email.toLowerCase().trim();
    }

    // ── Update password ────────────────────────────────────────────────────────
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Please provide your current password to set a new one.',
        });
      }

      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect.',
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters long.',
        });
      }

      user.password = newPassword; // pre-save hook will hash it
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile };
