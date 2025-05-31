const mongoose = require('mongoose');
const config = require('../config/config');
const Class = require('../models/Class');
const Lecturer = require('../models/Lecturer');

async function testConnection() {
  try {
    console.log('Attempting to connect to MongoDB Atlas...');
    await mongoose.connect(config.MONGODB_URI);
    console.log('Successfully connected to MongoDB Atlas');

    // Find a lecturer
    const lecturer = await Lecturer.findOne();
    if (!lecturer) {
      console.log('No lecturers found in database');
      return;
    }
    console.log('Found lecturer:', {
      _id: lecturer._id,
      lecturerId: lecturer.lecturerId,
      name: lecturer.name
    });

    // Create a test class
    const testClass = new Class({
      courseCode: 'TEST101',
      courseName: 'Test Course',
      section: 'A',
      room: 'Room 101',
      schedule: 'MWF 09:00 AM - 11:00 AM',
      lecturerId: lecturer.lecturerId,
      students: 0,
      createdAt: new Date()
    });

    await testClass.save();
    console.log('Successfully created test class:', {
      _id: testClass._id,
      courseCode: testClass.courseCode,
      lecturerId: testClass.lecturerId
    });

    // Find all classes for this lecturer
    const classes = await Class.find({ lecturerId: lecturer.lecturerId });
    console.log('Found classes for lecturer:', {
      lecturerId: lecturer.lecturerId,
      classCount: classes.length,
      classes: classes.map(c => ({
        _id: c._id,
        courseCode: c.courseCode
      }))
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testConnection(); 