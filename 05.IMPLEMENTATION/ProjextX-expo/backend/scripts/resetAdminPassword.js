const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

async function resetAdminPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB\n');

    // Find all admin accounts
    console.log('Current Admin Accounts:');
    console.log('---------------------');
    const admins = await Admin.find({});
    admins.forEach(admin => {
      console.log(`Username: ${admin.username}`);
      console.log(`Name: ${admin.name}`);
      console.log(`Role: ${admin.role}`);
      console.log(`Password: ${admin.password}`);
      console.log('---------------------');
    });

    // Reset password for admin@gmail.com
    const adminEmail = await Admin.findOne({ username: 'admin@gmail.com' });
    if (adminEmail) {
      adminEmail.password = 'admin123';
      await adminEmail.save();
      console.log('\nReset password for admin@gmail.com to: admin123');
    }

    // Reset password for admin
    const adminUser = await Admin.findOne({ username: 'admin' });
    if (adminUser) {
      adminUser.password = 'admin123';
      await adminUser.save();
      console.log('Reset password for admin to: admin123');
    }

    console.log('\nTry logging in with either:');
    console.log('1. Username: admin@gmail.com, Password: admin123');
    console.log('2. Username: admin, Password: admin123');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

resetAdminPassword(); 