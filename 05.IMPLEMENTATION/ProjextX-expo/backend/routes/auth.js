const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Lecturer = require('../models/Lecturer');
const Admin = require('../models/Admin');
const LoggingLog = require('../models/LoggingLog');
const bcrypt = require('bcrypt');
const config = require('../config/config');

// Unified Login route
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    console.log('Unified login attempt with identifier:', identifier);

    // Try to find user in all collections
    const student = await Student.findOne({
      $or: [
        { username: identifier },
        { email: identifier },
        { studentId: identifier }
      ]
    });

    const lecturer = await Lecturer.findOne({
      $or: [
        { username: identifier },
        { email: identifier }
      ]
    });

    const admin = await Admin.findOne({
      $or: [
        { username: identifier },
        { email: identifier }
      ]
    });

    // Determine which user was found
    let user = null;
    let role = null;
    let isValidPassword = false;

    if (student) {
      user = student;
      role = 'student';
      isValidPassword = await student.comparePassword(password);
    } else if (lecturer) {
      user = lecturer;
      role = 'lecturer';
      isValidPassword = await bcrypt.compare(password, lecturer.password);
    } else if (admin) {
      user = admin;
      role = 'admin';
      isValidPassword = await bcrypt.compare(password, admin.password);
    }

    if (!user || !isValidPassword) {
      // Log failed login attempt
      await LoggingLog.create({
        username: identifier,
        role: 'unknown',
        action: 'login_failed',
        details: {
          reason: !user ? 'user_not_found' : 'invalid_password',
          timestamp: new Date()
        }
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create token with role information
    const token = jwt.sign(
      { 
        userId: user._id, 
        role: role,
        ...(role === 'lecturer' ? { lecturerId: user.lecturerId } : {})
      },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Prepare user data based on role
    let userData = {
      id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: role
    };

    // Add role-specific fields
    if (role === 'student') {
      userData = {
        ...userData,
        studentId: user.studentId,
        course: user.course
      };
    } else if (role === 'lecturer') {
      userData = {
        ...userData,
        lecturerId: user.lecturerId,
        department: user.department,
        courses: user.courses
      };
    }

    // Log successful login for all users
    await LoggingLog.create({
      username: user.username,
      role: role,
      action: 'login_success',
      details: {
        userId: user._id,
        name: user.name,
        timestamp: new Date(),
        ...(role === 'student' ? { studentId: user.studentId } : {}),
        ...(role === 'lecturer' ? { lecturerId: user.lecturerId } : {})
      }
    });

    res.json({
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    // Log system error
    await LoggingLog.create({
      username: req.body.identifier || 'unknown',
      role: 'system',
      action: 'login_error',
      details: {
        error: error.message,
        timestamp: new Date()
      }
    });
    res.status(500).json({ message: 'Server error' });
  }
});

// Student Login route
router.post('/student/login', async (req, res) => {
  try {
    const { username, email, studentId, password } = req.body;
    console.log('Student login attempt:', {
      hasUsername: !!username,
      hasEmail: !!email,
      hasStudentId: !!studentId,
      hasPassword: !!password
    });

    // Try to find student by username, email, or studentId
    const student = await Student.findOne({
      $or: [
        { username: username },
        { email: email },
        { studentId: studentId }
      ]
    });

    console.log('Found student:', student ? {
      id: student._id,
      username: student.username,
      hasStoredPassword: !!student.password
    } : 'No student found');

    if (!student) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if we have both password and stored hash
    if (!password || !student.password) {
      console.error('Missing password data:', {
        requestHasPassword: !!password,
        studentHasPassword: !!student.password
      });
      return res.status(401).json({ message: 'Invalid credentials - missing password data' });
    }

    // Compare password using the model method
    try {
      console.log('Attempting password comparison');
      const isValidPassword = await student.comparePassword(password);
      console.log('Password comparison result:', isValidPassword);

      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials - password mismatch' });
      }
    } catch (bcryptError) {
      console.error('Password comparison error:', bcryptError);
      return res.status(500).json({ message: 'Error validating credentials' });
    }

    const token = jwt.sign(
      { userId: student._id, role: 'student' },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: student._id,
        username: student.username,
        name: student.name,
        studentId: student.studentId,
        email: student.email,
        course: student.course,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Lecturer Login route
router.post('/lecturer/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    console.log('Login attempt with:', { 
      username, 
      email,
      hasPassword: !!password 
    });

    // Try to find lecturer by username or email
    const lecturer = await Lecturer.findOne({
      $or: [
        { username: username },
        { email: email }
      ]
    });

    console.log('Found lecturer:', lecturer ? {
      _id: lecturer._id,
      lecturerId: lecturer.lecturerId,
      username: lecturer.username,
      email: lecturer.email,
      hasStoredPassword: !!lecturer.password
    } : 'No lecturer found');

    if (!lecturer) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!password || !lecturer.password) {
      console.error('Missing password data:', {
        requestHasPassword: !!password,
        lecturerHasPassword: !!lecturer.password
      });
      return res.status(401).json({ message: 'Invalid credentials - missing password data' });
    }

    // Compare password using bcrypt
    try {
      const isValidPassword = await bcrypt.compare(password, lecturer.password);
      console.log('Password comparison result:', isValidPassword);
      
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials - password mismatch' });
      }
    } catch (bcryptError) {
      console.error('Bcrypt error:', bcryptError);
      return res.status(500).json({ message: 'Error validating credentials' });
    }

    const token = jwt.sign(
      { 
        userId: lecturer._id, 
        role: 'lecturer',
        lecturerId: lecturer.lecturerId
      },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const responseData = {
      token,
      user: {
        id: lecturer._id,
        _id: lecturer._id,
        username: lecturer.username,
        name: lecturer.name,
        lecturerId: lecturer.lecturerId,
        email: lecturer.email,
        department: lecturer.department,
        courses: lecturer.courses,
      },
    };

    console.log('Sending login response:', {
      token: !!token,
      userData: {
        ...responseData.user,
        password: undefined
      }
    });

    res.json(responseData);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin Login route
router.post('/admin/logout', async (req, res) => {
  try {
    const { username, role, action } = req.body;
    
    // Create admin logout log entry with action dialog
    await LoggingLog.create({
      username,
      role,
      action: 'logout',
      details: {
        timestamp: new Date(),
        action_dialog: action || 'User logged out',
        userRole: role || 'admin',
        logoutType: 'manual',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });

    res.json({ 
      message: 'Logged out successfully',
      details: {
        username,
        timestamp: new Date(),
        action: action || 'User logged out'
      }
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Log the error
    await LoggingLog.create({
      username: req.body.username || 'unknown',
      role: req.body.role || 'admin',
      action: 'logout',
      details: {
        error: error.message,
        timestamp: new Date(),
        status: 'failed',
        reason: 'system_error'
      }
    });
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/admin/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    console.log('Admin login attempt:', { username, email });

    // Try to find admin by username or email
    const admin = await Admin.findOne({
      $or: [
        { username: username },
        { username: email }, // Try email as username since some admins use email as username
        { email: username }, // Try username as email
        { email: email }
      ]
    });

    console.log('Found admin:', admin ? {
      username: admin.username,
      name: admin.name,
      role: admin.role
    } : 'No admin found');

    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare password using bcrypt
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      console.log('Password mismatch');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: admin._id, role: 'admin' },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create admin log entry
    await LoggingLog.create({
      username: admin.username,
      role: admin.role || 'admin',
      action: 'login'
    });

    console.log('Admin login successful:', admin.username);

    res.json({
      token,
      user: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        role: admin.role || 'admin'
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin Registration route
router.post('/admin/register', async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    
    // Check if admin with this username already exists
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const newAdmin = new Admin({
      username,
      password: hashedPassword,
      name,
      role: role || 'Admin'
    });
    
    await newAdmin.save();
    
    // Create admin log entry
    await LoggingLog.create({
      username: newAdmin.username,
      role: newAdmin.role,
      action: 'registered'
    });
    
    res.status(201).json({
      id: newAdmin._id,
      name: newAdmin.name,
      email: newAdmin.username,
      role: newAdmin.role
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Lecturer Registration route
router.post('/lecturer/register', async (req, res) => {
  try {
    const { username, password, name, department, specialization, contactNumber } = req.body;
    
    // Check if lecturer with this username already exists
    const existingLecturer = await Lecturer.findOne({ username });
    if (existingLecturer) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Generate a lecturer ID (you can customize this)
    const lecturerId = 'L' + Date.now().toString().slice(-6);
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create new lecturer
    const newLecturer = new Lecturer({
      username,
      password: hashedPassword,
      name,
      lecturerId,
      email: username, // Assuming username is an email
      department,
      courses: [],
    });
    
    await newLecturer.save();
    
    res.status(201).json({
      id: newLecturer._id,
      name: newLecturer.name,
      email: newLecturer.email,
      department: newLecturer.department
    });
  } catch (error) {
    console.error('Lecturer registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
