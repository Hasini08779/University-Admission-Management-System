const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const Application = require('../models/Application');
const ActivityLog = require('../models/ActivityLog');
const { auth, requireRole } = require('../middleware/auth');
const studentsFilePath = path.join(__dirname, '..', '..', 'students.json');

const router = express.Router();

function readStudentsJson() {
  try {
    if (!fs.existsSync(studentsFilePath)) return [];
    const fileData = fs.readFileSync(studentsFilePath, 'utf8');
    return fileData ? JSON.parse(fileData) : [];
  } catch (err) {
    console.error('Error reading students.json:', err);
    return [];
  }
}

function writeStudentsJson(students) {
  try {
    fs.writeFileSync(studentsFilePath, JSON.stringify(students, null, 2));
  } catch (err) {
    console.error('Error writing students.json:', err);
  }
}

function normalizeDocKey(doc) {
  return doc.docId != null ? String(doc.docId) : String(doc._id);
}

function buildUploadedDocEntry(doc) {
  return {
    backendDocId: String(doc._id),
    fileName: doc.name,
    uploadDate: doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : new Date().toLocaleDateString(),
    size: doc.size,
    fileType: doc.type ? doc.type.split('/').pop() : '',
    status: doc.status === 'pending' ? 'pending_approval' : doc.status,
    rejectionReason: doc.rejectionReason || '',
    docId: doc.docId != null ? Number(doc.docId) : undefined,
    path: doc.path
  };
}

function updateStudentDocumentInJson(doc) {
  const students = readStudentsJson();
  let studentId = doc.student;
  if (studentId && typeof studentId === 'object') {
    studentId = studentId._id || studentId.id || studentId.toString();
  }
  studentId = String(studentId);
  console.log('updateStudentDocumentInJson: students.length:', students.length);
  console.log('updateStudentDocumentInJson: studentId:', studentId);
  const student = students.find(s => String(s._id) === studentId);
  console.log('updateStudentDocumentInJson: found student:', !!student);
  if (student) {
    console.log('updateStudentDocumentInJson: student._id:', student._id);
  }
  if (!student) {
    console.warn(`Student ${studentId} not found in students.json`);
    return;
  }

  if (!student.uploadedDocs || typeof student.uploadedDocs !== 'object') {
    student.uploadedDocs = {};
  }

  const key = normalizeDocKey(doc);
  student.uploadedDocs[key] = buildUploadedDocEntry(doc);
  writeStudentsJson(students);
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Upload document
router.post('/upload', auth, upload.single('document'), async (req, res) => {
  try {
    console.log('Upload endpoint hit');
    console.log('File received:', req.file);
    console.log('Body:', req.body);

    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { docId, docName } = req.body;
    console.log('DocId:', docId, 'DocName:', docName);

    // Create document record
    const document = new Document({
      student: req.user._id,
      name: req.file.originalname,
      docId: docId ? Number(docId) : undefined,
      type: req.file.mimetype,
      path: req.file.filename,
      size: req.file.size,
      status: 'pending'
    });

    await document.save();
    console.log('Document saved:', document._id);

    // Link document to the student's application record
    try {
      const application = await Application.findOne({ studentId: req.user._id });
      if (application) {
        application.documents = application.documents || [];
        const alreadyLinked = application.documents.some((docId) => String(docId) === String(document._id));
        if (!alreadyLinked) {
          application.documents.push(document._id);
          await application.save();
          console.log('Document linked to application:', application._id);
        }
      } else {
        console.warn('No application found for student when linking document:', req.user._id);
      }
    } catch (linkError) {
      console.error('Error linking document to application:', linkError);
    }

    // Log activity if user exists
    if (req.user) {
      await ActivityLog.create({
        user: req.user._id,
        action: 'document_upload',
        details: `Uploaded document: ${req.file.originalname}`
      });
    }

    updateStudentDocumentInJson(document);
    res.status(201).json(document);
  } catch (error) {
    console.error('Upload error:', error);
    if (req.file) {
      const failedPath = path.join(uploadsDir, req.file.filename);
      if (fs.existsSync(failedPath)) {
        fs.unlinkSync(failedPath);
      }
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Get student's documents
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'student') {
      query.student = req.user._id;
    }
    // Admin can see all

    const documents = await Document.find(query)
      .populate('student', 'name email')
      .populate('reviewedBy', 'name')
      .sort({ uploadedAt: -1 });

    res.json(documents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve document (admin only)
router.put('/:id/approve', auth, requireRole(['admin']), async (req, res) => {
  try {
    const document = await Document.findByIdAndUpdate(
      req.params.id,
      {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: req.user._id,
        rejectionReason: ''
      },
      { new: true }
    ).populate('student reviewedBy');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'document_approved',
      details: `Approved document for student: ${document.student.name}`
    });

    updateStudentDocumentInJson(document);
    res.json(document);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject document (admin only)
router.put('/:id/reject', auth, requireRole(['admin']), [
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
      details: `Rejected document for student: ${document.student.name} - Reason: ${reason}`
    });

    updateStudentDocumentInJson(document);
    res.json(document);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Download document (auth optional for now)
router.get('/:id/download', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id).populate('student');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const filePath = path.join(uploadsDir, document.path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Set content disposition based on file type
    const isPDF = document.type === 'application/pdf';
    res.setHeader('Content-Disposition', isPDF ? 'inline' : 'attachment');

    res.sendFile(filePath);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;