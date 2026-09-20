const express = require('express');
const User = require('../models/User');
const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get students assigned to faculty (for now, all students)
router.get('/students', auth, requireRole(['faculty', 'admin']), async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).populate('course').sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get documents for review
router.get('/documents', auth, requireRole(['faculty', 'admin']), async (req, res) => {
  try {
    const documents = await Document.find()
      .populate('student', 'name email')
      .populate('reviewedBy', 'name')
      .sort({ uploadedAt: -1 });

    res.json(documents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve document
router.put('/documents/approve', auth, requireRole(['faculty', 'admin']), async (req, res) => {
  try {
    const { studentEmail, docId } = req.body;
    const student = await User.findOne({ email: studentEmail });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    const document = await Document.findOneAndUpdate(
      { student: student._id, documentType: docId },
      {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: req.user._id
      },
      { new: true }
    ).populate('student reviewedBy');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Also update the user's uploadedDocs
    if (student.uploadedDocs && student.uploadedDocs[docId]) {
      student.uploadedDocs[docId].status = 'approved';
      student.uploadedDocs[docId].reviewedAt = new Date();
      await student.save();
    }

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'document_approved',
      details: `Faculty approved document for student: ${student.name}`
    });

    res.json({ message: 'Document approved', document });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/documents/:id/reject', auth, requireRole(['faculty', 'admin']), [
  require('express-validator').body('reason').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const { reason } = req.body;

    const document = await Document.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedBy: req.user._id
      },
      { new: true }
    ).populate('student reviewedBy');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'document_rejected',
      details: `Faculty rejected document for student: ${document.student.name} - Reason: ${reason}`
    });

    res.json(document);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update student status
router.put('/students/:id/status', auth, requireRole(['faculty', 'admin']), [
  require('express-validator').body('status').isIn(['pending', 'approved', 'rejected'])
], async (req, res) => {
  try {
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
      details: `Faculty updated student ${user.email} status to ${status}`
    });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;