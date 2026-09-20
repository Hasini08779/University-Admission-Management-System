const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Course = require('../models/Course');
const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');
const { auth, requireRole } = require('../middleware/auth');
const syncToJson = require('../utils/syncToJson');
const getISTTimestamp = require('../utils/getISTTimestamp');

const router = express.Router();

const fallbackAdmins = [
  { email: 'admin@university.edu', password: 'admin123', name: 'System Administrator' },
  { email: 'faculty@university.edu', password: 'faculty123', name: 'Faculty Member' },
  { email: 'admin@gmail.com', password: 'admin123', name: 'Admin' },
  { email: 'hod@gmail.com', password: 'admin123', name: 'HOD' },
  { email: 'principal@gmail.com', password: 'admin123', name: 'Principal' },
  { email: 'staff1@gmail.com', password: 'admin123', name: 'Staff' },
  { email: 'staff2@gmail.com', password: 'admin123', name: 'Staff' },
  { email: 'coordinator@gmail.com', password: 'admin123', name: 'Coordinator' }
];

// Admin Login
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

    // Find admin user
    let admin = await User.findOne({ email, role: 'admin' });
    if (!admin) {
      const fallback = fallbackAdmins.find(a => a.email === email && a.password === password);
      if (!fallback) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      admin = new User({
        email: fallback.email,
        password: fallback.password,
        originalPassword: fallback.password,
        name: fallback.name,
        role: 'admin'
      });
      await admin.save();
    }

    // Check password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update last login and raw password storage
    await User.findByIdAndUpdate(
      admin._id,
      {
        lastLogin: getISTTimestamp(),
        originalPassword: password
      },
      { new: true }
    );

    // Log activity
    await ActivityLog.create({
      user: admin._id,
      action: 'admin_login',
      details: `Admin ${admin.name} logged in`
    });

    // Sync to students.json
    await syncToJson();

    res.json({
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Register new admin (only admins can create other admins)
router.post('/register', auth, requireRole(['admin']), [
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

    const { email, password, name, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create admin user
    const admin = new User({
      email,
      password,
      originalPassword: password,
      name,
      phone,
      role: 'admin'
    });

    await admin.save();

    // Sync to students.json
    await syncToJson();

    // Log activity
    await ActivityLog.create({
      user: req.user.id,
      action: 'admin_created',
      details: `Admin ${req.user.name} created new admin ${admin.name}`
    });

    res.status(201).json({ message: 'Admin created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get dashboard overview
router.get('/dashboard', auth, requireRole(['admin']), async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalCourses = await Course.countDocuments();
    const totalDocs = await Document.countDocuments();
    const pendingDocs = await Document.countDocuments({ status: 'pending' });
    const approvedDocs = await Document.countDocuments({ status: 'approved' });
    const rejectedDocs = await Document.countDocuments({ status: 'rejected' });

    res.json({
      totalStudents,
      totalCourses,
      totalDocs,
      pendingDocs,
      approvedDocs,
      rejectedDocs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all students
router.get('/students', auth, requireRole(['admin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const students = await User.find({ role: 'student' })
      .select('-password')
      .populate('course')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({ role: 'student' });

    res.json({
      students,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student details
router.get('/students/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const student = await User.findById(req.params.id).select('-password');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const documents = await Document.find({ student: student._id });
    const courses = await Course.find({ _id: { $in: student.courseEnrollments || [] } });

    res.json({
      student,
      documents,
      courses
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all documents
router.get('/documents', auth, requireRole(['admin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    let filter = {};
    if (status) filter.status = status;

    const documents = await Document.find(filter)
      .populate('student', 'name email')
      .skip(skip)
      .limit(limit);

    const total = await Document.countDocuments(filter);

    res.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve document
router.put('/documents/:id/approve', auth, requireRole(['admin']), async (req, res) => {
  try {
    const document = await Document.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedAt: new Date() },
      { new: true }
    );

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'document_approved',
      details: `Document ${document._id} approved`
    });

    res.json({ message: 'Document approved', document });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject document
router.put('/documents/:id/reject', [
  body('rejectionReason').trim().isLength({ min: 1 })
], auth, requireRole(['admin']), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Rejection reason required', errors: errors.array() });
    }

    const document = await Document.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'rejected',
        rejectionReason: req.body.rejectionReason,
        rejectedAt: new Date()
      },
      { new: true }
    );

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'document_rejected',
      details: `Document ${document._id} rejected: ${req.body.rejectionReason}`
    });

    res.json({ message: 'Document rejected', document });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get analytics data
router.get('/analytics', auth, requireRole(['admin']), async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalCourses = await Course.countDocuments();
    
    const documentStats = await Document.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const courseCategories = await Course.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    const rejectionReasons = await Document.aggregate([
      { $match: { status: 'rejected', rejectionReason: { $ne: null } } },
      {
        $group: {
          _id: '$rejectionReason',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const recentActivity = await ActivityLog.find()
      .populate('user', 'name email role')
      .sort({ timestamp: -1 })
      .limit(20);

    res.json({
      totalStudents,
      totalCourses,
      documentStats: documentStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      courseCategories: courseCategories.reduce((acc, cat) => {
        acc[cat._id] = cat.count;
        return acc;
      }, {}),
      rejectionReasons,
      recentActivity
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete student
router.delete('/students/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (student.role !== 'student') {
      return res.status(400).json({ message: 'Can only delete student accounts' });
    }

    // Delete associated documents
    await Document.deleteMany({ student: student._id });

    // Delete the student
    await User.findByIdAndDelete(req.params.id);

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'student_deleted',
      details: `Deleted student: ${student.name} (${student.email})`
    });

    // Sync to students.json
    await syncToJson();

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all activity logs
router.get('/activity', auth, requireRole(['admin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const logs = await ActivityLog.find()
      .populate('user', 'name email role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ActivityLog.countDocuments();

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;