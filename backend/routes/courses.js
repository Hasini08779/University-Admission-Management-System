const express = require('express');
const { body, validationResult } = require('express-validator');
const Course = require('../models/Course');
const ActivityLog = require('../models/ActivityLog');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find().sort({ name: 1 });
    res.json(courses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new course (admin only)
router.post('/', auth, requireRole(['admin']), [
  body('name').trim().isLength({ min: 1 }),
  body('description').trim().isLength({ min: 1 }),
  body('category').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const course = new Course(req.body);
    await course.save();

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'course_created',
      details: `Created course: ${course.name}`
    });

    res.status(201).json(course);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Course name already exists' });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update course (admin only)
router.put('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'course_updated',
      details: `Updated course: ${course.name}`
    });

    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete course (admin only)
router.delete('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'course_deleted',
      details: `Deleted course: ${course.name}`
    });

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;