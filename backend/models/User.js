const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  originalPassword: {
    type: String
  },
  role: {
    type: String,
    enum: ['student', 'admin', 'faculty'],
    default: 'student'
  },
  name: {
    type: String,
    required: true
  },
  phone: String,
  studentId: {
    type: String,
    unique: true,
    sparse: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  applicationStatus: {
    type: String,
    enum: ['not_submitted', 'submitted'],
    default: 'not_submitted'
  },
  registrationData: {
    address: String,
    dateOfBirth: Date,
    gender: String,
    qualification: String
  },
  lastLogin: String,
  createdAt: {
    type: String,
    default: () => {
      const d = new Date();
      // IST = UTC + 5:30, but we need to properly add 5.5 hours
      const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
      const hh = String(istDate.getUTCHours()).padStart(2, '0');
      const mm = String(istDate.getUTCMinutes()).padStart(2, '0');
      const ss = String(istDate.getUTCSeconds()).padStart(2, '0');
      const yy = String(istDate.getUTCFullYear()).slice(-2);
      const mo = String(istDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(istDate.getUTCDate()).padStart(2, '0');
      return `${day}:${mo}:${yy}. ${hh}:${mm}:${ss}`;
    }
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Sync to JSON after deletion
userSchema.post('remove', async function(doc) {
  if (doc.role === 'student') {
    try {
      const syncToJson = require('../utils/syncToJson');
      await syncToJson();
      console.log('Students JSON synced after student deletion');
    } catch (error) {
      console.error('Error syncing students JSON after deletion:', error);
    }
  }
});

module.exports = mongoose.model('User', userSchema);