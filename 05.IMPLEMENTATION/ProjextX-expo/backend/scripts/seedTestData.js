require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Student = require('../models/Student');
const Lecturer = require('../models/Lecturer');
const Admin = require('../models/Admin');

const seedTestData = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = 'mongodb+srv://gardose997:gardose@cluster0.shlty5n.mongodb.net/AttendanceX?retryWrites=true&w=majority&appName=Cluster0';
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected Successfully');

    // Remove existing test data
    console.log('Removing existing test data...');
    await Student.deleteOne({ username: 'student1' });
    await Lecturer.deleteOne({ username: 'lecturer1' });
    await Admin.deleteOne({ username: 'admin' });

    console.log('Removed existing test data');

    // Hash passwords
    const saltRounds = 10;
    console.log('Hashing passwords...');
    const studentPassword = await bcrypt.hash('1234', saltRounds);
    const lecturerPassword = await bcrypt.hash('1234', saltRounds);
    const adminPassword = await bcrypt.hash('admin123', saltRounds);

    // Create test student
    console.log('Creating test student...');
    const testStudent = new Student({
      username: 'student1',
      password: studentPassword,
      name: 'John Doe',
      studentId: 'STU001',
      email: 'student1@example.com',
      course: 'Computer Science',
      studentType: 'Regular',
      year: '1',
      section: 'A',
    });

    // Create test lecturer
    console.log('Creating test lecturer...');
    const testLecturer = new Lecturer({
      username: 'lecturer1',
      password: lecturerPassword,
      name: 'Dr. Jane Smith',
      lecturerId: 'LEC001',
      email: 'lecturer1@example.com',
      department: 'Computer Science',
      courses: ['Programming 101', 'Data Structures'],
    });

    // Create admin user
    console.log('Creating admin user...');
    const admin = new Admin({
      username: 'admin',
      password: adminPassword,
      name: 'Admin User',
      role: 'Admin'
    });

    // Save test data
    await testStudent.save();
    console.log('Test student created successfully');

    await testLecturer.save();
    console.log('Test lecturer created successfully');

    await admin.save();
    console.log('Admin user created successfully');

    console.log('All test data seeded successfully!');
    console.log('\nTest Credentials:');
    console.log('Admin - username: admin, password: admin123');
    console.log('Student - username: student1, password: 1234');
    console.log('Lecturer - username: lecturer1, password: 1234');

  } catch (error) {
    console.error('Error seeding test data:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('Could not connect to MongoDB. Please check your connection string.');
    }
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

seedTestData();
