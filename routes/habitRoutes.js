const express = require('express');
const { body } = require('express-validator');
const { protectRoute } = require('../middleware/authMiddleware');
const {
  createHabit,
  getHabits,
  getHabit,
  updateHabit,
  deleteHabit,
  markHabitComplete,
} = require('../controllers/habitController');

const router = express.Router();

const habitValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required.'),
  body('description')
    .optional({ checkFalsy: true })
    .trim(),
];

router.use(protectRoute);

router.post('/', habitValidation, createHabit);
router.get('/', getHabits);
router.get('/:id', getHabit);
router.put('/:id', habitValidation, updateHabit);
router.delete('/:id', deleteHabit);
router.post('/:id/complete', markHabitComplete);

module.exports = router;