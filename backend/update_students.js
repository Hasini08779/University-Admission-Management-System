const mongoose = require('mongoose');
const User = require('./models/User');
const Application = require('./models/Application');
require('dotenv').config();
(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/university-admission');
  const users = await User.find({ role: 'student' }).lean();
  const applications = await Application.find({}).lean();
  
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

  const appMap = {};
  applications.forEach(app => {
    if (app.studentId) {
      const key = app.studentId.toString();
      appMap[key] = chooseBestApplication(appMap[key], app);
    }
  });
  
  const fs = require('fs');
  const path = require('path');
  const studentsFilePath = path.join(__dirname, '..', 'students.json');
  
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
  console.log('Updated students.json with fees data');
  process.exit(0);
})();