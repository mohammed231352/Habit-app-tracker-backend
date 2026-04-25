const express = require('express');
const { getProfile, updateProfile } = require('../controllers/userController');
const { protectRoute } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes below require authentication
router.use(protectRoute);

// GET  /api/user/profile
router.get('/profile', getProfile);

// PUT  /api/user/profile
router.put('/profile', updateProfile);

module.exports = router;
