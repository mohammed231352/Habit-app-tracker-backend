const express = require('express');
const { protectRoute } = require('../middleware/authMiddleware');
const {
  getStats,
  getDailyCompletions,
  getWeeklyTrends,
  getHabitPerformance,
  getHabitsList,
} = require('../controllers/dashboardController');

const router = express.Router();

router.use(protectRoute);

router.get('/stats', getStats);

router.get('/daily', getDailyCompletions);

router.get('/weekly', getWeeklyTrends);

router.get('/performance', getHabitPerformance);

router.get('/habits', getHabitsList);

module.exports = router;
