const mongoose = require('mongoose');
const Student = require('../models/Student');

const MONGODB_URI = 'mongodb://localhost:27017/projectx';

const seedStudents = [
  {
    studentId: 'ST001',
    name: 'John Doe',
    department: 'Computer Science'
  },
  {
    studentId: 'ST002',
    name: 'Jane Smith',
    department: 'Engineering'
  },
  {
    studentId: 'ST003',
    name: 'Bob Johnson',
    department: 'Mathematics'
  }
];

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Clear existing students
    await Student.deleteMany({});
    console.log('Cleared existing students');

    // Insert new students
    const result = await Student.insertMany(seedStudents);
    console.log('Inserted students:', result);

    console.log('Seeding completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error seeding database:', error);
    process.exit(1);
  }); 