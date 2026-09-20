const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/university-admission', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', () => {
  console.error('MongoDB connection failed');
  process.exit(1);
});

db.once('open', async () => {
  try {
    console.log('Connected to MongoDB. Syncing data...');

    // Query all students and admins from MongoDB
    const collection = db.collection('users');
    const students = await collection.find({ role: { $in: ['student', 'admin'] } }).toArray();

    // Query all courses
    const coursesCollection = db.collection('courses');
    const courses = await coursesCollection.find().toArray();

    // Create a mapping of course ObjectIds to course names
    const courseMap = {};
    courses.forEach(course => {
      courseMap[course._id.toString()] = course.name;
    });

    // Create formatted student data
    const formatDate = (date) => {
      const d = new Date(date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${hh}:${min}:${ss} ${yyyy}-${mm}-${dd}`;
    };

    // Read existing students.json to preserve uploadedDocs
    let existingStudents = [];
    try {
      const existingFilePath = path.join(__dirname, 'students.json');
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
      return {
        _id: studentIdStr,
        studentId: student.studentId || '',
        email: student.email,
        name: student.name,
        phone: student.phone || '',
        role: student.role,
        applicationStatus: student.applicationStatus || 'not_submitted',
        createdAt: formatDate(student.createdAt),
        course: student.course ? courseMap[student.course.toString()] || 'Not Selected' : 'Not Selected',
        uploadedDocs: existingStudent ? existingStudent.uploadedDocs : {}
      };
    });


    // Query applications and add to respective students
    const applicationsCollection = db.collection('applications');
    const applications = await applicationsCollection.find().toArray();

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
              date: formatDate(fee.date),
            })),
            submittedAt: app.submittedAt ? formatDate(app.submittedAt) : '',
          },
        };
      }
      return student;
    });

    // Sort by createdAt in ascending order (oldest first, newest last)
    studentsWithApps.sort((a, b) => {
      const dateA = new Date(a.createdAt.split(' ')[1] + ' ' + a.createdAt.split(' ')[0]);
      const dateB = new Date(b.createdAt.split(' ')[1] + ' ' + b.createdAt.split(' ')[0]);
      return dateA - dateB;
    });

    // Write to students.json
    const filePath = path.join(__dirname, 'students.json');
    fs.writeFileSync(filePath, JSON.stringify(studentsWithApps, null, 2));

    console.log(`✅ Sync successful! ${studentsWithApps.length} users (students & admins) synced to students.json`);
    process.exit(0);
  } catch (error) {
    console.error('Error syncing:', error);
    process.exit(1);
  }
});
