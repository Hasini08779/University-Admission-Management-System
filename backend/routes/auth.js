const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Application = require('../models/Application');
const ActivityLog = require('../models/ActivityLog');
const { auth } = require('../middleware/auth');
const syncToJson = require('../utils/syncToJson');
const getISTTimestamp = require('../utils/getISTTimestamp');

const router = express.Router();

async function generateStudentId() {
  const lastStudent = await User.findOne({
    role: 'student',
    studentId: { $exists: true, $ne: null }
  })
  .sort({ studentId: -1 })
  .select('studentId')
  .lean();

  const lastNumber = lastStudent && lastStudent.studentId
    ? parseInt(lastStudent.studentId.replace(/\D/g, ''), 10)
    : 0;
  const nextNumber = lastNumber + 1;
  return `STU${String(nextNumber).padStart(3, '0')}`;
}

// Register student
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().isLength({ min: 1 }),
  body('phone').optional().isMobilePhone()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { email, password, name, phone, ...registrationData } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = new User({
      email,
      password,
      originalPassword: password,
      name,
      phone,
      role: 'student',
      studentId: await generateStudentId(),
      registrationData
    });

    await user.save();

    // Sync to students.json
    await syncToJson();

    // Log activity
    await ActivityLog.create({
      user: user._id,
      action: 'registration',
      details: 'Student registered'
    });

    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login and raw password storage
    await User.findByIdAndUpdate(
      user._id,
      {
        lastLogin: getISTTimestamp(),
        originalPassword: password
      },
      { new: true }
    );

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log activity
    await ActivityLog.create({
      user: user._id,
      action: 'login',
      details: `${user.role} logged in`
    });

    // Sync to students.json
    await syncToJson();

    // Attach saved application data if available so frontend can restore form state
    const application = await Application.findOne({ studentId: user._id }).lean();
    let applicationPayload = null;
    if (application) {
      applicationPayload = {
        course: application.course,
        category: application.category,
        address: application.address,
        phone: application.phone,
        personalDetails: application.personalDetails || {},
        parentDetails: application.parentDetails || {},
        addressDetails: application.addressDetails || {},
        academicDetails: application.academicDetails || {},
        fees: Array.isArray(application.fees) ? application.fees : [],
        submittedAt: application.submittedAt,
        status: application.status || 'Pending'
      };
    }

    res.json({
      token,
      user: {
        _id: user._id,
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone || '',
        applicationStatus: user.applicationStatus || 'not_submitted',
        application: applicationPayload
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('course');
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout (client-side token removal, but log activity)
router.post('/logout', auth, async (req, res) => {
  try {
    await ActivityLog.create({
      user: req.user._id,
      action: 'logout',
      details: `${req.user.role} logged out`
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password (simplified for project)
router.post('/reset-password', [
  body('email').isEmail().normalizeEmail(),
  body('newPassword').isLength({ min: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { email, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword; // Will be hashed by pre-save
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;