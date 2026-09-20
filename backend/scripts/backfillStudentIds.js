const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function generateNextStudentId(lastId) {
  const lastNumber = lastId ? parseInt(lastId.replace(/\D/g, ''), 10) : 0;
  return `STU${String(lastNumber + 1).padStart(3, '0')}`;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/university-admission', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const students = await User.find({ role: 'student' }).sort({ studentId: 1, createdAt: 1 }).lean();
  let lastNumber = 0;

  for (const student of students) {
    if (student.studentId) {
      const current = parseInt(student.studentId.replace(/\D/g, ''), 10);
      if (!isNaN(current) && current > lastNumber) {
        lastNumber = current;
      }
      continue;
    }

    lastNumber += 1;
    const newStudentId = `STU${String(lastNumber).padStart(3, '0')}`;
    await User.updateOne({ _id: student._id }, { $set: { studentId: newStudentId } });
    console.log(`Backfilled user ${student.email} => ${newStudentId}`);
  }

  console.log('Backfill complete');
  await mongoose.disconnect();
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});