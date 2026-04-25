const Habit = require('../models/Habit');

const calculateStreak = (completedDates) => {
  if (!completedDates || completedDates.length === 0) return 0;

  const sortedDates = [...completedDates]
    .map((d) => new Date(d).setHours(0, 0, 0, 0))
    .sort((a, b) => b - a);

  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = today - 24 * 60 * 60 * 1000;

  const mostRecent = sortedDates[0];
  if (mostRecent !== today && mostRecent !== yesterday) {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const current = sortedDates[i - 1];
    const next = sortedDates[i];
    const diffDays = (current - next) / (24 * 60 * 60 * 1000);

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

const calculateLongestStreak = (completedDates) => {
  if (!completedDates || completedDates.length === 0) return 0;

  const sortedDates = [...completedDates]
    .map((d) => new Date(d).setHours(0, 0, 0, 0))
    .sort((a, b) => a - b);

  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const diffDays = (sortedDates[i] - sortedDates[i - 1]) / (24 * 60 * 60 * 1000);

    if (diffDays === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
  }

  return longestStreak;
};

const getDashboardStats = async (userId, habitId = null) => {
  let query = { userId };
  if (habitId) {
    query._id = habitId;
  }

  const habits = await Habit.find(query);

  if (habits.length === 0) {
    return {
      totalHabits: 0,
      completionRate: 0,
      bestStreak: 0,
      weeklyCompletions: 0,
    };
  }

  const today = new Date().setHours(0, 0, 0, 0);
  const sevenDaysAgo = today - 7 * 24 * 60 * 60 * 1000;

  let totalPossibleCompletions = habits.length * 7;
  let actualCompletions = 0;
  let weeklyCompletions = 0;
  let bestStreak = 0;

  habits.forEach((habit) => {
    const completedDates = habit.completedDates || [];

    const streak = calculateStreak(completedDates);
    bestStreak = Math.max(bestStreak, streak);

    completedDates.forEach((date) => {
      const d = new Date(date).setHours(0, 0, 0, 0);
      if (d >= sevenDaysAgo && d <= today) {
        actualCompletions++;
        weeklyCompletions++;
      }
    });
  });

  const completionRate = totalPossibleCompletions > 0
    ? Math.round((actualCompletions / totalPossibleCompletions) * 100)
    : 0;

  return {
    totalHabits: habits.length,
    completionRate,
    bestStreak,
    weeklyCompletions,
  };
};

const getDailyCompletions = async (userId, startDate, endDate, habitId = null) => {
  let query = { userId };
  if (habitId) {
    query._id = habitId;
  }

  const habits = await Habit.find(query);
  const dailyData = {};

  const start = new Date(startDate).setHours(0, 0, 0, 0);
  const end = new Date(endDate).setHours(0, 0, 0, 0);

  for (let d = start; d <= end; d += 24 * 60 * 60 * 1000) {
    const dateKey = new Date(d).toISOString().split('T')[0];
    dailyData[dateKey] = { date: dateKey, count: 0 };
  }

  habits.forEach((habit) => {
    const completedDates = habit.completedDates || [];
    completedDates.forEach((date) => {
      const d = new Date(date).setHours(0, 0, 0, 0);
      if (d >= start && d <= end) {
        const dateKey = new Date(d).toISOString().split('T')[0];
        if (dailyData[dateKey]) {
          dailyData[dateKey].count++;
        }
      }
    });
  });

  return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
};

const getWeeklyTrends = async (userId, weeks = 4, habitId = null) => {
  let query = { userId };
  if (habitId) {
    query._id = habitId;
  }

  const habits = await Habit.find(query);
  const weeklyData = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = new Date(today - i * 7 * 24 * 60 * 60 * 1000);
    const weekStart = new Date(weekEnd - 6 * 24 * 60 * 60 * 1000);

    let count = 0;
    habits.forEach((habit) => {
      const completedDates = habit.completedDates || [];
      completedDates.forEach((date) => {
        const d = new Date(date).setHours(0, 0, 0, 0);
        if (d >= weekStart && d <= weekEnd) {
          count++;
        }
      });
    });

    weeklyData.push({
      week: `Week ${weeks - i}`,
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0],
      count,
    });
  }

  return weeklyData;
};

const getHabitPerformance = async (userId) => {
  const habits = await Habit.find({ userId });

  const today = new Date().setHours(0, 0, 0, 0);
  const thirtyDaysAgo = today - 30 * 24 * 60 * 60 * 1000;

  const performance = habits.map((habit) => {
    const completedDates = habit.completedDates || [];
    const streak = calculateStreak(completedDates);
    const longestStreak = calculateLongestStreak(completedDates);
    const totalCompletions = completedDates.length;

    const completions30Days = completedDates.filter((d) => {
      const date = new Date(d).setHours(0, 0, 0, 0);
      return date >= thirtyDaysAgo && date <= today;
    }).length;

    return {
      id: habit._id,
      title: habit.title,
      streak,
      longestStreak,
      totalCompletions,
      completions30Days,
    };
  });

  return performance.sort((a, b) => b.completions30Days - a.completions30Days);
};

const getHabitsList = async (userId) => {
  const habits = await Habit.find({ userId }).select('_id title');
  return habits.map((h) => ({
    id: h._id,
    title: h.title,
  }));
};

module.exports = {
  getDashboardStats,
  getDailyCompletions,
  getWeeklyTrends,
  getHabitPerformance,
  getHabitsList,
  calculateStreak,
  calculateLongestStreak,
};
