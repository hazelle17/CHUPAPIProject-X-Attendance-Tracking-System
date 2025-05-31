const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Class = require('../models/Class');
const Lecturer = require('../models/Lecturer');
const auth = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const ClassStudent = require('../models/ClassStudent');
const LoggingLog = require('../models/LoggingLog');

// Get all classes
router.get('/', auth, async (req, res) => {
  try {
    const classes = await Class.find();
    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get class by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    res.json(classItem);
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get classes by lecturer ID
router.get('/lecturer/:lecturerId', auth, async (req, res) => {
  try {
    console.log('Received request for lecturer classes:', {
      requestedLecturerId: req.params.lecturerId,
      authUser: req.user
    });

    // First try to find lecturer by MongoDB _id
    let lecturer = null;
    
    // Check if the id is a valid MongoDB ObjectId
    if (req.params.lecturerId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Attempting to find lecturer by MongoDB _id');
      lecturer = await Lecturer.findById(req.params.lecturerId);
    }
    
    // If not found by _id, try to find by lecturerId
    if (!lecturer) {
      console.log('Attempting to find lecturer by lecturerId');
      lecturer = await Lecturer.findOne({ lecturerId: req.params.lecturerId });
    }
    
    if (!lecturer) {
      console.log('No lecturer found for ID:', req.params.lecturerId);
      return res.status(404).json({ message: 'Lecturer not found' });
    }

    console.log('Found lecturer:', {
      _id: lecturer._id,
      lecturerId: lecturer.lecturerId,
      name: lecturer.name
    });

    // Use the lecturerId string to find classes
    const query = { lecturerId: lecturer.lecturerId };
    console.log('Searching for classes with query:', query);
    
    const classes = await Class.find(query);
    
    console.log('Classes search result:', {
      query,
      foundCount: classes.length,
      classes: classes.map(c => ({
        _id: c._id,
        courseCode: c.courseCode,
        lecturerId: c.lecturerId
      }))
    });
    
    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes by lecturer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new class
router.post('/', auth, async (req, res) => {
  try {
    const { courseCode, courseName, section, room, schedule, lecturerId } = req.body;
    
    // Basic validation
    if (!courseCode || !courseName || !section || !room || !schedule || !lecturerId) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    // Check if lecturer exists
    let lecturer = null;
    
    // Check if the lecturerId is a valid MongoDB ObjectId
    if (lecturerId.match(/^[0-9a-fA-F]{24}$/)) {
      lecturer = await Lecturer.findById(lecturerId);
    }
    
    // If not found by _id, try to find by lecturerId
    if (!lecturer) {
      lecturer = await Lecturer.findOne({ lecturerId: lecturerId });
    }
    
    if (!lecturer) {
      return res.status(404).json({ message: 'Lecturer not found' });
    }
    
    // Create new class using the lecturer's string ID
    const newClass = new Class({
      courseCode,
      courseName,
      section,
      room,
      schedule,
      lecturerId: lecturer.lecturerId, // Use the string lecturerId
      students: 0,
      createdAt: new Date()
    });
    
    await newClass.save();
    
    // Add debugging log
    console.log('Created new class:', {
      courseCode,
      lecturerId: lecturer.lecturerId,
      classId: newClass._id
    });
    
    res.status(201).json(newClass);
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update a class
router.put('/:id', auth, async (req, res) => {
  try {
    const { courseCode, courseName, section, room, schedule } = req.body;
    
    // Find and update the class
    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      { 
        courseCode, 
        courseName, 
        section, 
        room, 
        schedule,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!updatedClass) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    res.json(updatedClass);
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a class
router.delete('/:id', auth, async (req, res) => {
  let session;
  try {
    console.log('Attempting to delete class with ID:', req.params.id);
    console.log('User info:', {
      userId: req.user._id,
      username: req.user.username,
      role: req.user.role
    });
    
    // Find the class first to ensure it exists and get its details
    const classToDelete = await Class.findById(req.params.id);
    console.log('Found class to delete:', classToDelete);
    
    if (!classToDelete) {
      console.log('Class not found with ID:', req.params.id);
      return res.status(404).json({ message: 'Class not found' });
    }

    // Log detailed permission check information
    console.log('Permission Check Details:', {
      user: {
        _id: req.user._id,
        userId: req.user.userId,
        role: req.user.role,
        lecturerId: req.user.lecturerId
      },
      class: {
        _id: classToDelete._id,
        courseCode: classToDelete.courseCode,
        lecturerId: classToDelete.lecturerId
      },
      checks: {
        isAdmin: req.user.role === 'admin',
        lecturerMatch: classToDelete.lecturerId === req.user.lecturerId,
        lecturerIds: {
          user: req.user.lecturerId,
          class: classToDelete.lecturerId,
          match: req.user.lecturerId === classToDelete.lecturerId
        }
      }
    });

    // Verify user has permission to delete this class
    if (req.user.role !== 'admin' && classToDelete.lecturerId !== req.user.lecturerId) {
      console.log('Permission Check Failed:', {
        user: {
          id: req.user._id,
          role: req.user.role,
          lecturerId: req.user.lecturerId,
          username: req.user.username
        },
        class: {
          id: classToDelete._id,
          lecturerId: classToDelete.lecturerId,
          courseCode: classToDelete.courseCode
        },
        checks: {
          isAdmin: req.user.role === 'admin',
          lecturerMatch: classToDelete.lecturerId === req.user.lecturerId
        }
      });
      return res.status(403).json({ 
        message: 'Not authorized to delete this class',
        details: {
          userRole: req.user.role,
          requiredRole: 'admin',
          userLecturerId: req.user.lecturerId,
          classLecturerId: classToDelete.lecturerId
        }
      });
    }

    // Start a session for transaction
    session = await mongoose.startSession();
    session.startTransaction();
    console.log('Started MongoDB transaction');

    try {
      // Delete related attendance records
      const attendanceResult = await Attendance.deleteMany({ 
        classId: new mongoose.Types.ObjectId(req.params.id) 
      }, { session });
      console.log('Deleted attendance records:', attendanceResult);
      
      // Delete related class student records
      const studentResult = await ClassStudent.deleteMany({ 
        classId: new mongoose.Types.ObjectId(req.params.id) 
      }, { session });
      console.log('Deleted class student records:', studentResult);
      
      // Delete the class itself
      const deleteResult = await Class.findByIdAndDelete(req.params.id, { session });
      console.log('Deleted class:', deleteResult);

      // Create a log entry
      const logEntry = new LoggingLog({
        username: req.user.username,
        role: req.user.role,
        action: `delete_class_${classToDelete.courseCode}`,
        details: {
          classId: classToDelete._id,
          courseCode: classToDelete.courseCode,
          courseName: classToDelete.courseName,
          lecturerId: classToDelete.lecturerId
        },
        timestamp: new Date()
      });
      await logEntry.save({ session });
      console.log('Created log entry');

      // Commit the transaction
      await session.commitTransaction();
      console.log('Transaction committed successfully');
      
      res.json({ 
        message: 'Class and related data deleted successfully',
        deletedClass: {
          courseCode: classToDelete.courseCode,
          courseName: classToDelete.courseName,
          section: classToDelete.section,
          lecturerId: classToDelete.lecturerId
        }
      });
    } catch (error) {
      // If anything fails, abort the transaction
      console.error('Error during transaction:', {
        error: error.message,
        stack: error.stack,
        phase: 'transaction',
        classId: req.params.id
      });
      await session.abortTransaction();
      throw error;
    }
  } catch (error) {
    console.error('Error deleting class:', {
      error: error.message,
      stack: error.stack,
      classId: req.params.id,
      userId: req.user?._id,
      phase: 'outer'
    });
    
    // Send appropriate error message based on error type
    let statusCode = 500;
    let errorMessage = 'Server error while deleting class';
    
    if (error.name === 'ValidationError') {
      statusCode = 400;
      errorMessage = 'Invalid class data';
    } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      if (error.code === 11000) {
        statusCode = 409;
        errorMessage = 'Conflict while deleting class';
      }
    }
    
    res.status(statusCode).json({ 
      message: errorMessage,
      error: error.message,
      details: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  } finally {
    // End the session if it was created
    if (session) {
      console.log('Ending MongoDB session');
      session.endSession();
    }
  }
});

// Add routes for lecturer-specific class management
// Create a class for a specific lecturer
router.post('/lecturer/:lecturerId/classes', auth, async (req, res) => {
  try {
    const { courseCode, courseName, section, room, schedule } = req.body;
    const { lecturerId } = req.params;
    
    // Basic validation
    if (!courseCode || !courseName || !section || !room || !schedule) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    // Check if lecturer exists
    const lecturer = await Lecturer.findOne({ lecturerId });
    if (!lecturer) {
      return res.status(404).json({ message: 'Lecturer not found' });
    }
    
    // Create new class
    const newClass = new Class({
      courseCode,
      courseName,
      section,
      room,
      schedule,
      lecturerId,
      students: 0,
      createdAt: new Date()
    });
    
    await newClass.save();
    
    res.status(201).json(newClass);
  } catch (error) {
    console.error('Error creating class for lecturer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all classes for a specific lecturer
router.get('/lecturer/:lecturerId/classes', auth, async (req, res) => {
  try {
    const classes = await Class.find({ lecturerId: req.params.lecturerId });
    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes for lecturer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update a class for a specific lecturer
router.put('/lecturer/:lecturerId/classes/:id', auth, async (req, res) => {
  try {
    const { courseCode, courseName, section, room, schedule } = req.body;
    const { lecturerId, id } = req.params;
    
    // Find the class
    const classItem = await Class.findById(id);
    
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Check if the class belongs to the lecturer
    if (classItem.lecturerId !== lecturerId) {
      return res.status(403).json({ message: 'Not authorized to update this class' });
    }
    
    // Update the class
    classItem.courseCode = courseCode || classItem.courseCode;
    classItem.courseName = courseName || classItem.courseName;
    classItem.section = section || classItem.section;
    classItem.room = room || classItem.room;
    classItem.schedule = schedule || classItem.schedule;
    classItem.updatedAt = new Date();
    
    await classItem.save();
    
    res.json(classItem);
  } catch (error) {
    console.error('Error updating class for lecturer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a class for a specific lecturer
router.delete('/lecturer/:lecturerId/classes/:id', auth, async (req, res) => {
  let session;
  try {
    const { lecturerId, id } = req.params;
    console.log('Attempting to delete class:', { classId: id, lecturerId });
    
    // Find the class first to ensure it exists and get its details
    const classToDelete = await Class.findById(id);
    console.log('Found class to delete:', classToDelete);
    
    if (!classToDelete) {
      console.log('Class not found with ID:', id);
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Check if the class belongs to the lecturer
    if (classToDelete.lecturerId !== lecturerId) {
      console.log('Unauthorized deletion attempt:', {
        requestedLecturerId: lecturerId,
        classLecturerId: classToDelete.lecturerId
      });
      return res.status(403).json({ message: 'Not authorized to delete this class' });
    }

    // Start a session for transaction
    session = await mongoose.startSession();
    session.startTransaction();
    console.log('Started MongoDB transaction');

    try {
      // Delete related attendance records
      const attendanceResult = await Attendance.deleteMany({ 
        classId: new mongoose.Types.ObjectId(id) 
      }, { session });
      console.log('Deleted attendance records:', attendanceResult);
      
      // Delete related class student records
      const studentResult = await ClassStudent.deleteMany({ 
        classId: new mongoose.Types.ObjectId(id) 
      }, { session });
      console.log('Deleted class student records:', studentResult);
      
      // Delete the class itself
      const deleteResult = await Class.findByIdAndDelete(id, { session });
      console.log('Deleted class:', deleteResult);

      // Create a log entry
      const logEntry = new LoggingLog({
        username: req.user.username,
        role: req.user.role,
        action: `lecturer_delete_class_${classToDelete.courseCode}`,
        timestamp: new Date()
      });
      await logEntry.save({ session });
      console.log('Created log entry');

      // Commit the transaction
      await session.commitTransaction();
      console.log('Transaction committed successfully');
      
      res.json({ 
        message: 'Class and related data deleted successfully',
        deletedClass: {
          courseCode: classToDelete.courseCode,
          courseName: classToDelete.courseName,
          section: classToDelete.section,
          lecturerId: classToDelete.lecturerId
        }
      });
    } catch (error) {
      // If anything fails, abort the transaction
      console.error('Error during transaction:', error);
      await session.abortTransaction();
      throw error;
    }
  } catch (error) {
    console.error('Error deleting class for lecturer:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: error.stack 
    });
  } finally {
    // End the session if it was created
    if (session) {
      console.log('Ending MongoDB session');
      session.endSession();
    }
  }
});

// Add a student to a class
router.post('/:classId/students', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const { 
      studentId, 
      studentName, 
      studentEmail, 
      yearLevel, 
      section,
      courseCode,
      courseName,
      classSection,
      room,
      schedule,
      lecturerId,
      lecturerName
    } = req.body;

    console.log('Received student data:', {
      studentId,
      studentName,
      studentEmail,
      yearLevel,
      section
    });

    // Basic validation
    if (!studentId || !studentName || !studentEmail || !yearLevel || !section) {
      console.log('Missing required fields:', {
        studentId: !studentId,
        studentName: !studentName,
        studentEmail: !studentEmail,
        yearLevel: !yearLevel,
        section: !section
      });
      return res.status(400).json({ 
        message: 'Please provide all required student information',
        missing: {
          studentId: !studentId,
          studentName: !studentName,
          studentEmail: !studentEmail,
          yearLevel: !yearLevel,
          section: !section
        }
      });
    }

    // Validate yearLevel
    const validYearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
    if (!validYearLevels.includes(yearLevel)) {
      console.log('Invalid year level:', {
        provided: yearLevel,
        valid: validYearLevels
      });
      return res.status(400).json({ 
        message: 'Invalid year level. Must be one of: ' + validYearLevels.join(', '),
        providedYearLevel: yearLevel
      });
    }

    // Find the class
    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if student already exists in the class
    if (classItem.studentList && classItem.studentList.some(student => student.studentId === studentId)) {
      return res.status(400).json({ message: 'Student already enrolled in this class' });
    }

    // Initialize studentList array if it doesn't exist
    if (!classItem.studentList) {
      classItem.studentList = [];
    }

    // Add the student with year level and section
    const newStudent = {
      studentId,
      studentName,
      studentEmail,
      yearLevel,
      section,
      enrolledAt: new Date()
    };

    console.log('Adding student to class:', newStudent);
    classItem.studentList.push(newStudent);

    // Update the students count
    classItem.students = classItem.studentList.length;

    // Save the updated class
    await classItem.save();

    // Create or update the student in the Student collection
    const Student = require('../models/Student');
    let student = await Student.findOne({ studentId });
    
    try {
      if (!student) {
        // Create new student if doesn't exist
        console.log('Creating new student:', {
          studentId,
          name: studentName,
          yearLevel,
          section
        });
        
        student = new Student({
          username: studentEmail,
          email: studentEmail,
          studentId,
          name: studentName,
          yearLevel,
          section,
          password: studentId, // Set a default password (they should change this)
          department: '',
          course: ''
        });
      } else {
        // Update existing student's year level and section
        console.log('Updating existing student:', {
          studentId,
          yearLevel,
          section
        });
        
        student.yearLevel = yearLevel;
        student.section = section;
      }
      
      await student.save();
      console.log('Student saved successfully');
    } catch (studentError) {
      console.error('Error saving student:', {
        error: studentError.message,
        stack: studentError.stack,
        validationErrors: studentError.errors
      });
      
      // If there's an error saving the student, we should still return success for the class enrollment
      // but include a warning in the response
      return res.status(200).json({
        message: 'Student added to class but profile update failed',
        warning: studentError.message,
        classStudent: newStudent
      });
    }

    res.status(200).json({
      message: 'Student added successfully',
      classStudent: newStudent
    });
  } catch (error) {
    console.error('Error adding student to class:', {
      error: error.message,
      stack: error.stack,
      validationErrors: error.errors
    });
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: error.stack,
      validationErrors: error.errors
    });
  }
});

// Remove a student from a class
router.delete('/:classId/students/:studentId', auth, async (req, res) => {
  try {
    const { classId, studentId } = req.params;
    console.log('Removing student from class:', { classId, studentId });

    // Find the class
    const classItem = await Class.findById(classId);
    if (!classItem) {
      console.log('Class not found:', classId);
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if student exists in the class
    const studentExists = classItem.studentList && 
      classItem.studentList.some(student => student.studentId === studentId);

    if (!studentExists) {
      console.log('Student not found in class:', { classId, studentId });
      return res.status(404).json({ message: 'Student not found in this class' });
    }

    // Remove the student
    classItem.studentList = classItem.studentList.filter(
      student => student.studentId !== studentId
    );
    classItem.students = classItem.studentList.length;
    
    console.log('Saving updated class:', {
      classId,
      newStudentCount: classItem.students,
      removedStudentId: studentId
    });

    await classItem.save();
    console.log('Class updated successfully');

    res.json({ 
      message: 'Student removed successfully',
      updatedStudentCount: classItem.students
    });
  } catch (error) {
    console.error('Error removing student from class:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all students in a class
router.get('/:classId/students', auth, async (req, res) => {
  try {
    const { classId } = req.params;

    // Find the class
    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }

    res.json(classItem.studentList || []);
  } catch (error) {
    console.error('Error fetching class students:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Test route to check all classes
router.get('/test/all', auth, async (req, res) => {
  try {
    console.log('Testing database connection and fetching all classes');
    
    // Get all classes
    const allClasses = await Class.find();
    
    console.log('Database test results:', {
      connected: mongoose.connection.readyState === 1,
      totalClasses: allClasses.length,
      classes: allClasses.map(c => ({
        _id: c._id,
        courseCode: c.courseCode,
        lecturerId: c.lecturerId
      }))
    });
    
    res.json({
      dbStatus: 'connected',
      classes: allClasses
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      message: 'Database test failed',
      error: error.message,
      dbStatus: mongoose.connection.readyState
    });
  }
});

module.exports = router;
