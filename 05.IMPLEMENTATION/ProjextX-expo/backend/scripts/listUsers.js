const mongoose = require('mongoose');
const Student = require('../models/Student');
const Lecturer = require('../models/Lecturer');
const Admin = require('../models/Admin');
require('dotenv').config();

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB\n');

    // List admins
    console.log('ADMIN ACCOUNTS:');
    console.log('--------------');
    const admins = await Admin.find({}, '-password');
    admins.forEach(admin => {
      console.log(`Username: ${admin.username}`);
      console.log(`Name: ${admin.name}`);
      console.log(`Role: ${admin.role}`);
      console.log('--------------');
    });

    // List lecturers
    console.log('\nLECTURER ACCOUNTS:');
    console.log('--------------');
    const lecturers = await Lecturer.find({}, '-password');
    lecturers.forEach(lecturer => {
      console.log(`Username: ${lecturer.username}`);
      console.log(`Name: ${lecturer.name}`);
      console.log(`Email: ${lecturer.email}`);
      console.log(`LecturerID: ${lecturer.lecturerId}`);
      console.log(`Department: ${lecturer.department}`);
      console.log('--------------');
    });

    // List students
    console.log('\nSTUDENT ACCOUNTS:');
    console.log('--------------');
    const students = await Student.find({}, '-password');
    students.forEach(student => {
      console.log(`Username: ${student.username}`);
      console.log(`Name: ${student.name}`);
      console.log(`Email: ${student.email}`);
      console.log(`StudentID: ${student.studentId}`);
      console.log(`Course: ${student.course}`);
      console.log(`Year: ${student.year}`);
      console.log(`Section: ${student.section}`);
      console.log(`Type: ${student.studentType}`);
      console.log('--------------');
    });

  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

listUsers(); 