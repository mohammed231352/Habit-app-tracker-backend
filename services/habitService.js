const Habit = require('../models/Habit');

function calculateCurrentStreak(dates) {
  if (!dates || dates.length === 0) return 0;

  // Remove duplicate days.
  const uniqueDates = [...new Set(dates.map((d) => new Date(d).toDateString()))];

  // Sort descending (latest first).
  const sorted = uniqueDates.sort((a, b) => new Date(b) - new Date(a));

  let streak = 0;
  const currentDate = new Date();

  for (let i = 0; i < sorted.length; i += 1) {
    const date = new Date(sorted[i]);

    if (date.toDateString() === currentDate.toDateString()) {
      streak += 1;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

const attachCurrentStreak = (habit) => ({
  ...habit._doc,
  currentStreak: calculateCurrentStreak(habit.completedDates),
});

const createHabit = async (userId, data) => {
  return Habit.create({
    userId,
    title: data.title.trim(),
    description: data.description ? data.description.trim() : '',
  });
};

const getUserHabits = async (userId) => {
  const habits = await Habit.find({ userId }).sort({ createdAt: -1 });

  return habits.map((habit) => attachCurrentStreak(habit));
};

const getHabitById = async (userId, habitId) => {
  const habit = await Habit.findOne({ _id: habitId, userId });

  if (!habit) {
    return null;
  }

  return attachCurrentStreak(habit);
};

const updateHabit = async (userId, habitId, data) => {
  const updateData = {
    title: data.title.trim(),
  };

  if (Object.prototype.hasOwnProperty.call(data, 'description')) {
    updateData.description = data.description ? data.description.trim() : '';
  }

  return Habit.findOneAndUpdate(
    { _id: habitId, userId },
    { $set: updateData },
    { new: true, runValidators: true }
  );
};

const deleteHabit = async (userId, habitId) => {
  return Habit.findOneAndDelete({ _id: habitId, userId });
};

const markHabitComplete = async (userId, habitId) => {
  const habit = await Habit.findOne({ _id: habitId, userId });

  if (!habit) {
    return null;
  }

  const today = new Date().toDateString();

  const alreadyCompleted = habit.completedDates.some(
    (d) => new Date(d).toDateString() === today
  );

  if (!alreadyCompleted) {
    habit.completedDates.push(new Date());
    await habit.save();
  }

  return attachCurrentStreak(habit);
};

module.exports = {
  createHabit,
  getUserHabits,
  getHabitById,
  updateHabit,
  deleteHabit,
  markHabitComplete,
};