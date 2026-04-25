const dashboardService = require('../services/dashboardService');

const getStats = async (req, res, next) => {
  try {
    const { habitId } = req.query;
    const stats = await dashboardService.getDashboardStats(req.user.id, habitId || null);

    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
};

const getDailyCompletions = async (req, res, next) => {
  try {
    const { startDate, endDate, habitId } = req.query;

    const today = new Date();
    const defaultEnd = today.toISOString().split('T')[0];
    const defaultStart = new Date(today - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const start = startDate || defaultStart;
    const end = endDate || defaultEnd;

    const data = await dashboardService.getDailyCompletions(
      req.user.id,
      start,
      end,
      habitId || null
    );

    return res.json({
      success: true,
      data,
      startDate: start,
      endDate: end,
    });
  } catch (error) {
    next(error);
  }
};

const getWeeklyTrends = async (req, res, next) => {
  try {
    const { weeks, habitId } = req.query;
    const weeksCount = parseInt(weeks) || 4;

    const data = await dashboardService.getWeeklyTrends(
      req.user.id,
      weeksCount,
      habitId || null
    );

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

const getHabitPerformance = async (req, res, next) => {
  try {
    const performance = await dashboardService.getHabitPerformance(req.user.id);

    return res.json({
      success: true,
      performance,
    });
  } catch (error) {
    next(error);
  }
};

const getHabitsList = async (req, res, next) => {
  try {
    const habits = await dashboardService.getHabitsList(req.user.id);

    return res.json({
      success: true,
      habits,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getDailyCompletions,
  getWeeklyTrends,
  getHabitPerformance,
  getHabitsList,
};
