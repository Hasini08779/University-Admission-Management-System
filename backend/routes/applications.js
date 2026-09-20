const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const { auth, requireRole } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const studentsFilePath = path.resolve(__dirname, '..', '..', 'students.json');

const chooseBestApplication = (existing, candidate) => {
  if (!existing) return candidate;

  const existingFeeCount = Array.isArray(existing.fees) ? existing.fees.length : 0;
  const candidateFeeCount = Array.isArray(candidate.fees) ? candidate.fees.length : 0;
  if (candidateFeeCount !== existingFeeCount) {
    return candidateFeeCount > existingFeeCount ? candidate : existing;
  }

  const existingDate = existing.submittedAt ? new Date(existing.submittedAt) : new Date(0);
  const candidateDate = candidate.submittedAt ? new Date(candidate.submittedAt) : new Date(0);
  return candidateDate > existingDate ? candidate : existing;
};

async function findBestApplicationForStudent(studentId) {
  const applications = await Application.find({ studentId });
  if (!applications || applications.length === 0) return null;
  return applications.reduce((best, candidate) => chooseBestApplication(best, candidate), applications[0]);
}

async function writeStudentsJson() {
  const User = require('../models/User');
  const users = await User.find({ role: 'student' }).lean();
  const applications = await Application.find({}).lean();

  console.log('writeStudentsJson: found', applications.length, 'applications');
  applications.forEach(app => console.log('  app studentId:', app.studentId, 'fees length:', app.fees ? app.fees.length : 'no fees'));

  // Read existing students.json to preserve passwords
  let passwordMap = {};
  try {
    if (fs.existsSync(studentsFilePath)) {
      const existingData = fs.readFileSync(studentsFilePath, 'utf8');
      if (existingData && existingData.trim()) {
        const existingStudents = JSON.parse(existingData);
        existingStudents.forEach(s => {
          if (s.email && s.password) {
            passwordMap[s.email] = s.password;
          }
        });
      }
    }
  } catch (e) {
    console.log('writeStudentsJson: could not read existing passwords');
  }

  const appMap = {};
  applications.forEach(app => {
    if (app.studentId) {
      const key = app.studentId.toString();
      appMap[key] = chooseBestApplication(appMap[key], app);
    }
  });

  console.log('writeStudentsJson: appMap keys:', Object.keys(appMap));
  Object.keys(appMap).forEach(key => console.log('  appMap[', key, '] fees length:', appMap[key].fees ? appMap[key].fees.length : 'no fees'));

  const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${min}:${ss} ${yyyy}-${mm}-${dd}`;
  };

  const formatDOB = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const students = users.map(u => {
    const student = {
      _id: u._id.toString(),
      email: u.email,
      name: u.name,
      phone: u.phone,
      role: u.role,
      applicationStatus: u.applicationStatus,
      createdAt: formatDate(u.createdAt)
    };

    // Preserve password if it exists from registration
    if (passwordMap[u.email]) {
      student.password = passwordMap[u.email];
    }

    const app = appMap[u._id.toString()];
    console.log('writeStudentsJson: user', u.email, 'app found:', !!app, 'fees:', app ? (app.fees ? app.fees.length : 'no fees field') : 'no app');
    if (app) {
      const personalDetails = { ...app.personalDetails };
      if (personalDetails.dob) {
        personalDetails.dob = formatDOB(personalDetails.dob);
      }

      student.application = {
        course: app.course,
        category: app.category,
        address: app.address,
        personalDetails,
        parentDetails: app.parentDetails,
        addressDetails: app.addressDetails,
        academicDetails: app.academicDetails,
        fees: app.fees,
        submittedAt: formatDate(app.submittedAt)
      };
    }

    return student;
  });

  console.log('writeStudentsJson: students with fees:');
  students.forEach(s => {
    if (s.application && s.application.fees) {
      console.log('  ', s.email, 'fees length:', s.application.fees.length);
    }
  });

  try {
    console.log('writeStudentsJson: writing', students.length, 'students to', studentsFilePath);
    fs.writeFileSync(studentsFilePath, JSON.stringify(students, null, 2));
    console.log('writeStudentsJson: success');
  } catch (writeError) {
    console.error('writeStudentsJson: failed to write students.json', writeError);
  }
}

// Submit application (Student)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, course, category, address, studentId, dob, gender, mobile, father, mother, city, state, pincode, tenth, twelfth, board, feesAmount, feesStatus, feesDueDate } = req.body;
    let application = await Application.findOne({ studentId });
    if (!application) {
      application = new Application({
        studentId: studentId,
        name,
        email,
        phone,
        course: course || null, // Allow null if course not found
        category,
        address,
        personalDetails: { dob, gender, mobile },
        parentDetails: { father, mother },
        addressDetails: { address, city, state, pincode },
        academicDetails: { tenth, twelfth, board },
        fees: feesAmount ? [{
          amount: Number(feesAmount),
          status: feesStatus || 'pending',
          dueDate: feesDueDate ? new Date(feesDueDate) : null,
          date: new Date()
        }] : []
      });
    } else {
      application.name = name;
      application.email = email;
      application.phone = phone;
      application.course = course || application.course || null;
      application.category = category || application.category;
      application.address = address || application.address;
      application.personalDetails = { dob, gender, mobile };
      application.parentDetails = { father, mother };
      application.addressDetails = { address, city, state, pincode };
      application.academicDetails = { tenth, twelfth, board };
      if (feesAmount) {
        application.fees = application.fees || [];
        application.fees.push({
          amount: Number(feesAmount),
          status: feesStatus || 'pending',
          dueDate: feesDueDate ? new Date(feesDueDate) : null,
          date: new Date()
        });
      }
    }
    await application.save();
    // Update user's application status
    const User = require('../models/User');
    await User.findByIdAndUpdate(studentId, { applicationStatus: 'submitted' });

    // Update students.json with full data
    try {
      const users = await User.find({ role: 'student' }).lean();
      const applications = await Application.find({}).lean();
      
      const appMap = {};
      applications.forEach(app => {
        if (app.studentId) {
          const key = app.studentId.toString();
          appMap[key] = chooseBestApplication(appMap[key], app);
        }
      });
      
      const formatDate = (date) => {
        const d = new Date(date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        return hh + ':' + min + ':' + ss + ' ' + yyyy + '-' + mm + '-' + dd;
      };
      
      const formatDOB = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return yyyy + '-' + mm + '-' + dd;
      };
      
      const students = users.map(u => {
        const student = {
          _id: u._id.toString(),
          email: u.email,
          name: u.name,
          phone: u.phone,
          role: u.role,
          applicationStatus: u.applicationStatus,
          createdAt: formatDate(u.createdAt)
        };
        
        const app = appMap[u._id.toString()];
        if (app) {
          const personalDetails = { ...app.personalDetails };
          if (personalDetails.dob) {
            personalDetails.dob = formatDOB(personalDetails.dob);
          }
          
          student.application = {
            course: app.course,
            category: app.category,
            address: app.address,
            personalDetails,
            parentDetails: app.parentDetails,
            addressDetails: app.addressDetails,
            academicDetails: app.academicDetails,
            fees: app.fees,
            submittedAt: formatDate(app.submittedAt)
          };
        }
        
        return student;
      });
      
      fs.writeFileSync(studentsFilePath, JSON.stringify(students, null, 2));
      console.log('Updated students.json with full data');
    } catch (updateError) {
      console.error('Error updating students.json:', updateError);
    }

    res.status(201).json({ message: 'Application submitted successfully', application });
  } catch (error) {
    console.error('Application submission error:', error);
    res.status(500).json({ message: 'Error submitting application', error: error.message });
  }
});

// Record a payment for an existing application (Student)
router.post('/:studentId/pay', async (req, res) => {
  try {
    const { amount, type } = req.body;
    const { studentId } = req.params;

    console.log(`Payment attempt for studentId: ${studentId}, amount: ${amount}, type: ${type}`);

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    // Temporarily remove auth check
    // If student is paying, always use their own ID for authorization
    // if (req.user.role === 'student') {
    //   if (req.user.id !== studentId) {
    //     return res.status(403).json({ message: 'Forbidden' });
    //   }
    // }

    const application = await findBestApplicationForStudent(studentId);
    if (!application) {
      console.log(`Application not found for studentId: ${studentId}`);
      return res.status(404).json({ message: 'Application not found' });
    }

    console.log(`Found application, current fees:`, application.fees);

    const parseFeeEntry = (entry) => {
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) return entry;
      if (typeof entry !== 'string') return null;

      const trimmed = entry.trim();
      try {
        return JSON.parse(trimmed);
      } catch (jsonError) {
        let jsonLike = trimmed;

        // Normalize JS-style object literals into JSON-compatible form.
        jsonLike = jsonLike.replace(/([\{\[,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
        jsonLike = jsonLike.replace(/:\s*'([^']*)'/g, ': "$1"');
        jsonLike = jsonLike.replace(/:\s*([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]+Z)(?=\s*[,\}])/g, ': "$1"');

        try {
          return JSON.parse(jsonLike);
        } catch (jsonError2) {
          try {
            return eval(`(${trimmed})`);
          } catch (evalError) {
            return null;
          }
        }
      }
    };

    const payment = {
      amount: Number(amount),
      type: type || 'Other',
      status: 'Recorded',
      date: new Date()
    };

    if (!Array.isArray(application.fees)) {
      application.fees = [];
    }
    application.fees.push(payment);

    console.log(`Saving application with fees:`, application.fees);
    const savedApplication = await application.save();

    console.log(`Payment saved successfully for studentId: ${studentId}`);

    await writeStudentsJson();
    res.json({ message: 'Payment recorded successfully', application: savedApplication });
  } catch (error) {
    console.error(`Payment submission error for studentId=${req.params.studentId}:`, error);
    res.status(500).json({
      message: 'Error recording payment',
      error: error.message,
      stack: error.stack
    });
  }
});

// Get application data for a student
router.get('/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    // Temporarily remove auth check
    // if (req.user.role === 'student' && req.user.id !== studentId) {
    //   return res.status(403).json({ message: 'Forbidden' });
    // }

    const application = await findBestApplicationForStudent(studentId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json({ application });
  } catch (error) {
    console.error(`Application fetch error for studentId=${req.params.studentId}:`, error);
    res.status(500).json({ message: 'Error fetching application', error: error.message });
  }
});

// Get all applications (Admin)
router.get('/', auth, requireRole(['admin']), async (req, res) => {
  try {
    const applications = await Application.find()
      .populate('studentId', 'name email')
      .populate('course', 'name')
      .populate('reviewerId', 'name')
      .sort({ submittedAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching applications', error: error.message });
  }
});

// Get application by ID (Admin)
router.get('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('studentId', 'name email phone')
      .populate('course')
      .populate('reviewerId', 'name')
      .populate('documents');
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.json(application);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching application', error: error.message });
  }
});

// Update application status (Admin)
router.put('/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { status } = req.body;
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      {
        status,
        reviewedAt: new Date(),
        reviewerId: req.user._id
      },
      { new: true }
    ).populate('studentId', 'name email').populate('course', 'name');
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.json({ message: 'Application updated successfully', application });
  } catch (error) {
    res.status(500).json({ message: 'Error updating application', error: error.message });
  }
});

module.exports = router;