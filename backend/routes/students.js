const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Course = require('../models/Course');
const ActivityLog = require('../models/ActivityLog');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get student profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('course');
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update student course selection
router.put('/course', auth, [
  body('courseId').optional({ nullable: true }).custom(value => {
    if (value === undefined || value === null) return true;
    if (typeof value !== 'string') throw new Error('courseId must be a string or course name');
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { courseId } = req.body;
    let updateData = {};

    if (courseId) {
      let course = null;
      if (mongoose.isValidObjectId(courseId)) {
        course = await Course.findById(courseId);
      } else {
        course = await Course.findOne({ name: courseId });
      }

      if (!course) {
        // Create missing course with basic defaults so enrollment can still work
        const courseToCategory = {
          'Computer Science (CSE)': 'Engineering',
          'Information Technology (IT)': 'Engineering',
          'Electronics & Communication (ECE)': 'Engineering',
          'AI & Machine Learning': 'Engineering',
          'Cyber Security': 'Engineering',
          'Data Science': 'Engineering',
          'Blockchain Technology': 'Engineering',
          'Electronics': 'Engineering',
          'Electrical': 'Engineering',
          'Mechanical': 'Engineering',
          'Civil': 'Engineering',
          'Chemical': 'Engineering',
          'Aerospace': 'Engineering',
          'Biomedical': 'Engineering',
          'Biotechnology': 'Engineering',
          'Agricultural': 'Engineering',
          'Psychology': 'Arts',
          'Sociology': 'Arts',
          'English': 'Arts',
          'History': 'Arts',
          'Philosophy': 'Arts',
          'Journalism': 'Arts',
          'Design': 'Arts',
          'Environmental': 'Arts',
          'MBA': 'Management',
          'BBA': 'Management',
          'MCA': 'Management',
          'Economics': 'Management',
          'Finance': 'Management',
          'Marketing': 'Management',
          'HR': 'Management',
          'Management': 'Management'
        };
        const category = courseToCategory[courseId] || 'Engineering';
        course = await Course.create({
          name: courseId,
          description: `${courseId} program enrolled by student`,
          category: category,
          duration: '4 Years'
        });
      }
      updateData.course = course._id;
    } else {
      updateData.course = null;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).populate('course');

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'course_selection',
      details: `Selected course: ${user.course ? user.course.name : 'None'}`
    });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// Update student registration data
router.put('/registration', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { registrationData: req.body },
      { new: true }
    );

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'profile_update',
      details: 'Updated registration information'
    });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all students (admin only)
router.get('/', auth, requireRole(['admin']), async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).populate('course').sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update student status (admin only)
router.put('/:id/status', auth, requireRole(['admin']), [
  body('status').isIn(['pending', 'approved', 'rejected'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'status_update',
      details: `Updated student ${user.email} status to ${status}`
    });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;