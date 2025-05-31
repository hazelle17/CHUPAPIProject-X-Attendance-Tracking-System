const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const ClassStudent = require('../models/ClassStudent');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

// Get all students
router.get('/', async (req, res) => {
  try {
    const students = await Student.find().select('-password');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a new student
router.post('/', async (req, res) => {
  try {
    console.log('Received student data:', req.body);
    
    // Check that required fields are present
    if (!req.body.studentId || !req.body.name || !req.body.email) {
      return res.status(400).json({ message: 'Student ID, name, and email are required' });
    }
    
    // Safe access to studentType with fallback
    const studentType = (req.body.studentType || 'Regular');
    
    // Use studentId as the default password if not provided
    const password = req.body.password || req.body.studentId;
    
    const student = new Student({
      studentType: studentType, // No toLowerCase to avoid errors
      username: req.body.email,
      password: password, // In production, this should be hashed
      name: req.body.name,
      studentId: req.body.studentId,
      email: req.body.email,
      course: req.body.course || '',
      year: req.body.year || '',
      section: req.body.section || ''
    });

    const newStudent = await student.save();
    
    // Remove password from response
    const studentResponse = newStudent.toObject();
    delete studentResponse.password;
    
    res.status(201).json(studentResponse);
  } catch (error) {
    console.error('Error saving student:', error);
    res.status(400).json({ message: error.message });
  }
});

// Search students by name or ID
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    console.log('Search query received:', query);
    
    if (!query) {
      return res.json([]);
    }

    const searchRegex = new RegExp(query, 'i');
    const students = await Student.find({
      $or: [
        { name: searchRegex },
        { studentId: searchRegex }
      ]
    })
    .select('name studentId')
    .limit(3);

    console.log('Search results:', students);
    res.json(students);
  } catch (error) {
    console.error('Error searching students:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get student by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add student to class
router.post('/class/:classId/student', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const { studentId, studentName, courseCode, courseName, section, room, schedule, lecturerId, lecturerName } = req.body;

    // Generate timestamp
    const timestamp = Date.now();
    
    // Create unique ID
    const uniqueId = `${studentId}_${courseCode}_${timestamp}`;

    // Create new class student entry
    const classStudent = new ClassStudent({
      studentId,
      studentName,
      classId: mongoose.Types.ObjectId(classId),
      courseCode,
      courseName,
      section,
      room,
      schedule,
      lecturerId,
      lecturerName,
      date: new Date(), // You can modify this as needed
      status: "present", // Default status
      timestamp,
      uniqueId
    });

    const savedClassStudent = await classStudent.save();
    console.log('Saved class student:', savedClassStudent);

    res.status(201).json({
      success: true,
      message: 'Student added to class successfully',
      classStudent: savedClassStudent
    });
  } catch (error) {
    console.error('Error adding student to class:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
