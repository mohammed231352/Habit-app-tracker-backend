const { validationResult } = require('express-validator');
const habitService = require('../services/habitService');

const createHabit = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const habit = await habitService.createHabit(req.user.id, req.body);

    return res.status(201).json({
      success: true,
      message: 'Habit created successfully.',
      habit,
    });
  } catch (error) {
    next(error);
  }
};

const getHabits = async (req, res, next) => {
  try {
    const habits = await habitService.getUserHabits(req.user.id);

    return res.json({
      success: true,
      habits,
    });
  } catch (error) {
    next(error);
  }
};

const getHabit = async (req, res, next) => {
  try {
    const habit = await habitService.getHabitById(req.user.id, req.params.id);

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found.',
      });
    }

    return res.json({
      success: true,
      habit,
    });
  } catch (error) {
    next(error);
  }
};

const updateHabit = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }

    const habit = await habitService.updateHabit(req.user.id, req.params.id, req.body);

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Habit updated successfully.',
      habit,
    });
  } catch (error) {
    next(error);
  }
};

const deleteHabit = async (req, res, next) => {
  try {
    const habit = await habitService.deleteHabit(req.user.id, req.params.id);

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Habit deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

const markHabitComplete = async (req, res, next) => {
  try {
    const habit = await habitService.markHabitComplete(req.user.id, req.params.id);

    if (!habit) {
      return res.status(404).json({
        success: false,
        message: 'Habit not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Habit marked as completed.',
      habit,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createHabit,
  getHabits,
  getHabit,
  updateHabit,
  deleteHabit,
  markHabitComplete,
};