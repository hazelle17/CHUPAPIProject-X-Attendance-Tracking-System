const mongoose = require('mongoose');
const Student = require('../models/Student');
const Lecturer = require('../models/Lecturer');
require('dotenv').config();

async function createTestUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Create test lecturer
    const testLecturer = new Lecturer({
      username: 'lecturer@test.com',
      password: 'lecturer123',
      name: 'Test Lecturer',
      lecturerId: 'L123456',
      email: 'lecturer@test.com',
      department: 'Computer Science',
      courses: ['CS101', 'CS102']
    });
    await testLecturer.save();
    console.log('Test lecturer created');

    // Create test student
    const testStudent = new Student({
      studentType: 'Regular',
      username: 'student@test.com',
      password: 'student123',
      name: 'Test Student',
      studentId: 'S123456',
      email: 'student@test.com',
      course: 'Computer Science',
      year: '2024',
      section: 'A'
    });
    await testStudent.save();
    console.log('Test student created');

    console.log('\nTest accounts created successfully:');
    console.log('Lecturer - username: lecturer@test.com, password: lecturer123');
    console.log('Student - username: student@test.com, password: student123');
    console.log('\nExisting admin account:');
    console.log('Admin - username: admin, password: admin123');

  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createTestUsers(); 