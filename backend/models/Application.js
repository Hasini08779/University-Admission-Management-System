const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  amount: Number,
  type: {
    type: String,
    default: 'Other'
  },
  status: String,
  dueDate: Date,
  date: Date
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
    // removed 'required: true' to allow undefined
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  course: {
    type: String, // Accept program name as string instead of ObjectId
    default: null
  },
  category: {
    type: String,
    default: 'General'
  },
  address: String,
  personalDetails: {
    dob: Date,
    gender: String,
    mobile: String
  },
  parentDetails: {
    father: String,
    mother: String
  },
  addressDetails: {
    address: String,
    city: String,
    state: String,
    pincode: String
  },
  academicDetails: {
    tenth: Number,
    twelfth: Number,
    board: String
  },
  fees: [feeSchema],
  status: {
    type: String,
    enum: ['Pending', 'Under Review', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date,
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }]
});

module.exports = mongoose.model('Application', applicationSchema);