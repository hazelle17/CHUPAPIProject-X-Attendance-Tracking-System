const mongoose = require('mongoose');

const ClassStudentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Class'
  },
  courseCode: {
    type: String,
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  yearLevel: {
    type: String,
    required: true,
    enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year']
  },
  section: {
    type: String,
    required: true
  },
  room: {
    type: String,
    required: true
  },
  schedule: {
    type: String,
    required: true
  },
  lecturerId: {
    type: String,
    required: true
  },
  lecturerName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late'],
    default: 'present'
  },
  timestamp: {
    type: Number,
    required: true
  },
  uniqueId: {
    type: String,
    required: true,
    unique: true
  }
});

module.exports = mongoose.model('ClassStudent', ClassStudentSchema); 