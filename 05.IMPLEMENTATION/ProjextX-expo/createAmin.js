const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Update this path based on your actual user model location
const User = require('./backend/models/Admin');

const mongoURI = 'mongodb+srv://gardose997:gardose@cluster0.shlty5n.mongodb.net/AttendanceX?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(mongoURI)
  .then(async () => {
    const email = 'admin@example.com';
    const plainPassword = '123456';

    // Check if admin user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('⚠️ User already exists.');
      return process.exit(0);
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Create new admin user
    await User.create({
      email,
      password: hashedPassword,
      role: 'admin'
    });

    console.log('✅ Admin user created!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
