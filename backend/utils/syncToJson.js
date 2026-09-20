const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Application = require('../models/Application');
const Course = require('../models/Course');

const syncToJson = async () => {
  try {
    // Query all students and admins from MongoDB
    const students = await User.find({ role: { $in: ['student', 'admin'] } })
      .lean();

    // Query all courses
    const courses = await Course.find().lean();

    // Create a mapping of course ObjectIds to course names
    const courseMap = {};
    courses.forEach(course => {
      courseMap[course._id.toString()] = course.name;
    });

    // Create formatted student data
    const formatDate = (date) => {
      // If already a string (IST format), return as-is
      if (typeof date === 'string' && date.includes('.') && date.includes(':')) {
        return date;
      }
      // If Date object or ISO string, convert to IST
      const d = new Date(date);
      // IST = UTC + 5:30
      const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
      const hh = String(istDate.getUTCHours()).padStart(2, '0');
      const mm = String(istDate.getUTCMinutes()).padStart(2, '0');
      const ss = String(istDate.getUTCSeconds()).padStart(2, '0');
      const yy = String(istDate.getUTCFullYear()).slice(-2);
      const mo = String(istDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(istDate.getUTCDate()).padStart(2, '0');
      return `${day}:${mo}:${yy}. ${hh}:${mm}:${ss}`;
    };

    // Read existing students.json to preserve uploadedDocs
    let existingStudents = [];
    try {
      const existingFilePath = path.join(__dirname, '..', '..', 'students.json');
      if (fs.existsSync(existingFilePath)) {
        const existingData = fs.readFileSync(existingFilePath, 'utf8');
        if (existingData && existingData.trim()) {
          existingStudents = JSON.parse(existingData);
        }
      }
    } catch (e) {
      console.log('Could not read existing students.json, starting fresh');
    }

    const formattedStudents = students.map((student) => {
      const studentIdStr = student._id.toString();
      const existingStudent = existingStudents.find(s => s._id === studentIdStr);
      const isAdmin = student.role === 'admin';

      const baseRecord = {
        _id: studentIdStr,
        email: student.email,
        password: student.originalPassword || '',
        name: student.name,
        phone: student.phone || '',
        role: student.role,
        createdAt: formatDate(student.createdAt),
        lastLogin: student.lastLogin ? formatDate(student.lastLogin) : ''
      };

      if (isAdmin) {
        return baseRecord;
      }

      return {
        ...baseRecord,
        studentId: student.studentId || '',
        applicationStatus: student.applicationStatus || 'not_submitted',
        course: student.course ? courseMap[student.course.toString()] || 'Not Selected' : 'Not Selected',
        uploadedDocs: existingStudent ? existingStudent.uploadedDocs : {}
      };
    });

    // Query applications and add to respective students
    const applications = await Application.find().lean();

    const studentsWithApps = formattedStudents.map(student => {
      const app = applications.find(a => a.studentId && a.studentId.toString() === student._id);
      if (app) {
        return {
          ...student,
          application: {
            course: app.course || '',
            category: app.category || '',
            address: app.address || '',
            personalDetails: app.personalDetails || {},
            parentDetails: app.parentDetails || {},
            addressDetails: app.addressDetails || {},
            academicDetails: app.academicDetails || {},
            fees: (app.fees || []).map(fee => ({
              amount: fee.amount,
              type: fee.type || '',
              status: fee.status || '',
              date: fee.date ? formatDate(fee.date) : '',
            })),
            submittedAt: app.submittedAt ? formatDate(app.submittedAt) : '',
          },
        };
      }
      return student;
    });

    // Sort by createdAt in ascending order (oldest first, newest last)
    const parseFormattedDate = (formattedDate) => {
      if (!formattedDate) return new Date(0);
      // Format: "dd:mm:yy. hh:mm:ss"
      const [datePart, timePart] = formattedDate.split('. ');
      const [dd, mm, yy] = datePart.split(':');
      const [hh, min, ss] = timePart.split(':');
      return new Date(`20${yy}-${mm}-${dd}T${hh}:${min}:${ss}`);
    };

    studentsWithApps.sort((a, b) => {
      const dateA = parseFormattedDate(a.createdAt);
      const dateB = parseFormattedDate(b.createdAt);
      return dateA - dateB;
    });

    // Write to students.json
    const filePath = path.join(__dirname, '..', '..', 'students.json');
    fs.writeFileSync(filePath, JSON.stringify(studentsWithApps, null, 2));

    console.log(`✅ Synced to students.json (${studentsWithApps.length} users - students & admins)`);
  } catch (error) {
    console.error('Error syncing to JSON:', error);
  }
};

module.exports = syncToJson;
