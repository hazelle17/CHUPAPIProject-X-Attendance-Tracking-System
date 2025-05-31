const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Lecturer = require('../models/Lecturer');
const config = require('../config/config');

async function hashExistingPasswords() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all lecturers
    const lecturers = await Lecturer.find({});
    console.log(`Found ${lecturers.length} lecturers`);

    // Hash passwords for each lecturer
    for (const lecturer of lecturers) {
      if (lecturer.password && !lecturer.password.startsWith('$2b$')) {
        // Only hash if password exists and isn't already hashed
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(lecturer.password, saltRounds);
        lecturer.password = hashedPassword;
        await lecturer.save();
        console.log(`Hashed password for lecturer: ${lecturer.username}`);
      }
    }

    console.log('Finished hashing passwords');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

hashExistingPasswords(); 