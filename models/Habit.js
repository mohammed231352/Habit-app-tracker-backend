const mongoose = require('mongoose');

const HabitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    completedDates: {
      type: [Date],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Habit = mongoose.model('Habit', HabitSchema);

module.exports = Habit;